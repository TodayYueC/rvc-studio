#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{fs::File, process::{Child, Command, Stdio}, sync::{Mutex, atomic::{AtomicBool, Ordering}}};
use tauri::{Manager, State, menu::{Menu, MenuItem}, tray::TrayIconBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
struct Engine { child: Mutex<Option<Child>>, shortcut_available: AtomicBool }
fn stop_child(state: &Engine) -> Result<(),String> {
    let mut guard=state.child.lock().map_err(|e|e.to_string())?;
    if let Some(mut c)=guard.take() { let _=c.kill(); let _=c.wait(); }
    Ok(())
}
fn script(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(debug_assertions)] { let _ = app; return Ok(std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../backend/engine.py")); }
    #[cfg(not(debug_assertions))] { Ok(app.path().resource_dir().map_err(|e| e.to_string())?.join("_up_/backend/engine.py")) }
}
fn log_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf,String> { let dir=app.path().app_data_dir().map_err(|e|e.to_string())?; std::fs::create_dir_all(&dir).map_err(|e|e.to_string())?; Ok(dir.join("engine.log")) }
#[tauri::command]
fn devices(app: tauri::AppHandle, python: String) -> Result<serde_json::Value,String> {
    if python.is_empty() {return Err("请先选择 Python 解释器".into());}
    let output=Command::new(python).env("PYTHONIOENCODING","utf-8").arg(script(&app)?).arg("devices").output().map_err(|e|e.to_string())?;
    if !output.status.success() {return Err(String::from_utf8_lossy(&output.stderr).into_owned());}
    serde_json::from_slice(&output.stdout).map_err(|e|e.to_string())
}
#[tauri::command]
fn start_engine(app: tauri::AppHandle, state: State<Engine>, config: serde_json::Value) -> Result<(),String> {
    let mut guard=state.child.lock().map_err(|e|e.to_string())?;
    if let Some(c)=guard.as_mut() { if c.try_wait().map_err(|e|e.to_string())?.is_none() {return Err("引擎已在运行".into());} }
    let python=config["python"].as_str().filter(|s|!s.is_empty()).ok_or("请先选择 Python")?;
    let log=File::create(log_path(&app)?).map_err(|e|e.to_string())?;
    let err=log.try_clone().map_err(|e|e.to_string())?;
    let child=Command::new(python).arg("-u").arg(script(&app)?).arg("run").env("PYTHONIOENCODING","utf-8").env("RVC_STUDIO_CONFIG",config.to_string()).stdout(Stdio::from(log)).stderr(Stdio::from(err)).spawn().map_err(|e|e.to_string())?;
    *guard=Some(child); Ok(())
}
#[tauri::command]
fn stop_engine(state: State<Engine>) -> Result<(),String> { stop_child(&state) }
#[tauri::command]
fn engine_status(app: tauri::AppHandle,state: State<Engine>) -> Result<serde_json::Value,String> {
    let mut guard=state.child.lock().map_err(|e|e.to_string())?;
    let running=match guard.as_mut(){Some(c)=>c.try_wait().map_err(|e|e.to_string())?.is_none(),None=>false};
    let log=std::fs::read_to_string(log_path(&app)?).unwrap_or_default();
    Ok(serde_json::json!({"running":running,"shortcutAvailable":state.shortcut_available.load(Ordering::Relaxed),"log":log.chars().rev().take(12000).collect::<String>().chars().rev().collect::<String>()}))
}
fn main() {
    tauri::Builder::default()
        .manage(Engine { child: Mutex::new(None), shortcut_available: AtomicBool::new(false) })
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "打开 RVC Studio", true, None::<&str>)?;
            let stop = MenuItem::with_id(app, "stop", "停止变声", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &stop, &quit])?;
            let mut tray = TrayIconBuilder::new().menu(&menu).tooltip("RVC Studio")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => { if let Some(window)=app.get_webview_window("main") { let _=window.show(); let _=window.set_focus(); } }
                    "stop" => { let _=stop_child(&app.state::<Engine>()); }
                    "quit" => { let _=stop_child(&app.state::<Engine>()); app.exit(0); }
                    _ => {}
                });
            if let Some(icon)=app.default_window_icon() { tray=tray.icon(icon.clone()); }
            tray.build(app)?;
            let shortcut=Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::F8);
            app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, key, event| {
                if key == &shortcut && event.state() == ShortcutState::Pressed {
                    let _=stop_child(&app.state::<Engine>());
                }
            }).build())?;
            let available=app.global_shortcut().register(shortcut).is_ok();
            app.state::<Engine>().shortcut_available.store(available,Ordering::Relaxed);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![devices,start_engine,stop_engine,engine_status])
        .on_window_event(|window,event| {
            if let tauri::WindowEvent::CloseRequested { api, .. }=event {
                api.prevent_close();
                let _=window.hide();
            }
        })
        .run(tauri::generate_context!()).expect("failed to run application");
}
