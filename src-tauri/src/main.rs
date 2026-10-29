#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{fs::File, process::{Child, Command, Stdio}, sync::Mutex};
use tauri::{Manager, State};
struct Engine(Mutex<Option<Child>>);
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
    let mut guard=state.0.lock().map_err(|e|e.to_string())?;
    if let Some(c)=guard.as_mut() { if c.try_wait().map_err(|e|e.to_string())?.is_none() {return Err("引擎已在运行".into());} }
    let python=config["python"].as_str().filter(|s|!s.is_empty()).ok_or("请先选择 Python")?;
    let log=File::create(log_path(&app)?).map_err(|e|e.to_string())?;
    let err=log.try_clone().map_err(|e|e.to_string())?;
    let child=Command::new(python).arg("-u").arg(script(&app)?).arg("run").env("PYTHONIOENCODING","utf-8").env("RVC_STUDIO_CONFIG",config.to_string()).stdout(Stdio::from(log)).stderr(Stdio::from(err)).spawn().map_err(|e|e.to_string())?;
    *guard=Some(child); Ok(())
}
#[tauri::command]
fn stop_engine(state: State<Engine>) -> Result<(),String> { let mut guard=state.0.lock().map_err(|e|e.to_string())?; if let Some(mut c)=guard.take() {let _=c.kill(); let _=c.wait();} Ok(()) }
#[tauri::command]
fn engine_status(app: tauri::AppHandle,state: State<Engine>) -> Result<serde_json::Value,String> {
    let mut guard=state.0.lock().map_err(|e|e.to_string())?;
    let running=match guard.as_mut(){Some(c)=>c.try_wait().map_err(|e|e.to_string())?.is_none(),None=>false};
    let log=std::fs::read_to_string(log_path(&app)?).unwrap_or_default();
    Ok(serde_json::json!({"running":running,"log":log.chars().rev().take(12000).collect::<String>().chars().rev().collect::<String>()}))
}
fn main() { tauri::Builder::default().manage(Engine(Mutex::new(None))).plugin(tauri_plugin_dialog::init()).invoke_handler(tauri::generate_handler![devices,start_engine,stop_engine,engine_status]).on_window_event(|window,event| { if let tauri::WindowEvent::Destroyed=event { let state=window.state::<Engine>(); if let Ok(mut g)=state.0.lock() { if let Some(mut c)=g.take(){let _=c.kill();let _=c.wait();} } } }).run(tauri::generate_context!()).expect("failed to run application"); }
