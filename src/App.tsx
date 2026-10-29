import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { motion } from 'motion/react'
import { Button } from './components/ui/button'
import { Activity, AudioLines, BookOpen, Settings, SlidersHorizontal, CircleHelp, Play, Square, RefreshCw, FolderOpen } from 'lucide-react'
import './App.css'

type Config = { python:string; root:string; model:string; index:string; input:number; output:number; rate:number; block:number; pitch:number; formant:number; indexRate:number; threshold:number }
type Device = { id:number; name:string; inputs:number; outputs:number; host:string }
type Voice = { id:string; name:string; model:string; index:string }
const defaults:Config = { python:'',root:'',model:'',index:'',input:-1,output:-1,rate:48000,block:200,pitch:12,formant:0,indexRate:0,threshold:-60 }
const pages = [['home','主页',AudioLines],['library','音色库',BookOpen],['tuning','调音工作台',SlidersHorizontal],['settings','设置',Settings],['diagnostics','诊断',Activity],['help','使用指南',CircleHelp]] as const
function App(){
 const [page,setPage]=useState<string>('home')
 const [cfg,setCfg]=useState<Config>(()=>{try{return {...defaults,...JSON.parse(localStorage.getItem('rvc-settings')||'{}'),input:-1,output:-1}}catch{return defaults}})
 const [voices,setVoices]=useState<Voice[]>(()=>{try{return JSON.parse(localStorage.getItem('rvc-voices')||'[]')}catch{return []}})
 const [voiceName,setVoiceName]=useState('')
 const [downloadMessage,setDownloadMessage]=useState('')
 const [devices,setDevices]=useState<Device[]>([])
 const [status,setStatus]=useState('未启动')
 const [log,setLog]=useState('')
 const [busy,setBusy]=useState(false)
 const [shortcutAvailable,setShortcutAvailable]=useState<boolean|null>(null)
 useEffect(()=>{localStorage.setItem('rvc-settings',JSON.stringify(cfg))},[cfg])
 useEffect(()=>{localStorage.setItem('rvc-voices',JSON.stringify(voices))},[voices])
 useEffect(()=>{invoke<{shortcutAvailable:boolean}>('engine_status').then(r=>setShortcutAvailable(r.shortcutAvailable)).catch(()=>{})},[])
 useEffect(()=>{
   if(status!=='启动中' && status!=='音频运行中') return
   let active=true
   const timer=window.setInterval(async()=>{try{const r=await invoke<{running:boolean,log:string}>('engine_status');if(!active)return;setLog(r.log);setStatus(r.running?(r.log.includes('Audio stream started')?'音频运行中':'启动中'):'引擎已退出')}catch(e){if(active){setLog(String(e));setStatus('状态读取失败')}}},2000)
   return ()=>{active=false;window.clearInterval(timer)}
 },[status])
 const update=<K extends keyof Config>(key:K,value:Config[K])=>setCfg(old=>({...old,[key]:value}))
 async function choose(key:'python'|'root'|'model'|'index',directory=false){try{const p=await open({directory,multiple:false,filters:key==='model'?[{name:'RVC 模型',extensions:['pth']}]:key==='index'?[{name:'索引',extensions:['index']}]:undefined});if(typeof p==='string')update(key,p)}catch(e){setLog(String(e))}}
 async function refresh(){setBusy(true);try{const result=await invoke<Device[]>('devices',{python:cfg.python});setDevices(result);setCfg(c=>({...c,input:-1,output:-1}));setLog(`发现 ${result.length} 个音频设备，请重新选择。`)}catch(e){setLog(String(e))}finally{setBusy(false)}}
 async function downloadDemo(){setBusy(true);setDownloadMessage('正在下载并校验模型，约 55 MB，请稍候…');try{const result=await invoke<{path:string}>('download_demo',{python:cfg.python});setCfg(c=>({...c,model:result.path,index:'',indexRate:0}));setVoices(v=>v.some(item=>item.model===result.path)?v:[...v,{id:crypto.randomUUID(),name:'AISO HOWATTO',model:result.path,index:''}]);setDownloadMessage('下载并校验成功，已加入音色库。')}catch(e){setDownloadMessage(`下载失败：${String(e)}`)}finally{setBusy(false)}}
 async function start(){setBusy(true);try{await invoke('start_engine',{config:cfg});setStatus('启动中');setLog('正在加载模型，请在诊断页刷新状态。')}catch(e){setStatus('启动失败');setLog(String(e))}finally{setBusy(false)}}
 async function stop(){try{await invoke('stop_engine');setStatus('已停止')}catch(e){setLog(String(e))}}
 async function check(){try{const r=await invoke<{running:boolean,log:string}>('engine_status');setStatus(r.running?(r.log.includes('Audio stream started')?'音频运行中':'启动中'):'未运行');setLog(r.log||'没有日志')}catch(e){setLog(String(e))}}
 const picker=(label:string,key:'python'|'root'|'model'|'index',directory=false)=><label className="field"><span>{label}</span><div className="path"><input value={cfg[key]} onChange={e=>update(key,e.target.value)} placeholder="选择路径"/><button onClick={()=>choose(key,directory)} aria-label={`选择${label}`}><FolderOpen size={17}/></button></div></label>
 const slider=(label:string,key:'pitch'|'formant'|'indexRate'|'threshold'|'block',min:number,max:number,step:number,unit='')=><label className="slider"><div><span>{label}</span><strong>{cfg[key]}{unit}</strong></div><input type="range" min={min} max={max} step={step} value={cfg[key]} onChange={e=>update(key,Number(e.target.value))}/></label>
 const selectDevice=(label:string,key:'input'|'output')=><label className="field"><span>{label}</span><select value={cfg[key]} onChange={e=>update(key,Number(e.target.value))}><option value={-1}>系统默认</option>{devices.filter(d=>key==='input'?d.inputs>0:d.outputs>0).map(d=><option key={d.id} value={d.id}>{d.name} · {d.host}</option>)}</select></label>
 return <div className="app"><aside><div className="brand"><div className="logo"><AudioLines size={21}/></div><div><b>RVC Studio</b><small>LOCAL VOICE WORKSPACE</small></div></div><nav>{pages.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav><div className="sidefoot"><span className="dot"/>本地工作区 <small>开发预览</small></div></aside><main><header><div><span className="eyebrow">RVC STUDIO / {page.toUpperCase()}</span><h1>{pages.find(p=>p[0]===page)?.[1]}</h1></div><div className="status"><span className="dot"/>{status}</div></header>
 {page==='home'&&<><motion.section initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.3}} className="hero"><div><span className="pill">你的声音，你来定义</span><h2>让声音有更多可能。</h2><p>在本机处理实时语音。选择模型、连接音频设备，然后开始调试属于你的音色。</p><div className="actions"><Button className="primary" disabled={busy} onClick={start}><Play size={16}/>开始变声</Button><Button variant="outline" onClick={stop}><Square size={15}/>停止</Button></div></div><div className="orb"><AudioLines size={64}/></div></motion.section><div className="grid"><section className="card"><h3>当前音色</h3><p>{cfg.model?cfg.model.split(/[\\/]/).pop():'尚未选择模型'}</p><button onClick={()=>setPage('library')}>管理音色 →</button></section><section className="card"><h3>音频连接</h3><p>麦克风 → RVC → 输出设备</p><button onClick={()=>setPage('settings')}>配置设备 →</button></section><section className="card"><h3>首次使用？</h3><p>准备运行环境、模型和虚拟音频设备。</p><button onClick={()=>setPage('help')}>查看指南 →</button></section></div></>}
 {page==='library'&&<section className="panel"><h2>你的音色</h2><p>选择本机已有的模型和可选索引。仅加载来源可信且有权使用的文件。</p>{picker('模型文件 .pth','model')}{picker('索引文件 .index（可选）','index')}<label className="field"><span>音色名称</span><input value={voiceName} onChange={e=>setVoiceName(e.target.value)} placeholder="例如：自然音色"/></label><button disabled={!cfg.model||!voiceName.trim()} onClick={()=>{setVoices(v=>[...v,{id:crypto.randomUUID(),name:voiceName.trim(),model:cfg.model,index:cfg.index}]);setVoiceName('')}}>保存到音色库</button><div className="voice-list">{voices.map(v=><div className="voice" key={v.id}><div><b>{v.name}</b><small>{v.model}</small></div><div className="actions"><button onClick={()=>setCfg(c=>({...c,model:v.model,index:v.index,indexRate:v.index?c.indexRate:0}))}>使用</button><button onClick={()=>setVoices(items=>items.filter(item=>item.id!==v.id))}>移除记录</button></div></div>)}</div><div className="notice"><b>可选下载：AISO HOWATTO</b><p>日语训练的少女音色。发布说明声明模型为 MIT 许可，并说明声音提供者同意 AI 使用。制作者：鶴乃；发行：ちはや神社。该模型无音高引导，发布方建议较长音频块和零索引混合，延迟及中文效果需要试听。</p><p>条款及来源：huggingface.co/wok000/vcclient_model（rvc_v2_chihaya_jinja/description.txt）</p><button disabled={busy} onClick={downloadDemo}>下载并校验模型</button>{downloadMessage&&<p role="status">{downloadMessage}</p>}</div><div className="notice">音色库只保存本机路径，移除记录不会删除文件。其他模型的使用和再分发权限取决于提供者。</div></section>}
 {page==='tuning'&&<section className="panel"><h2>声音调节</h2><p>这些设置将在下次启动时生效。声音效果取决于模型和原始声音。</p>{slider('音高','pitch',-24,24,1,' 半音')}{slider('共振峰','formant',-12,12,0.5)}{slider('索引混合','indexRate',0,1,0.05)}{slider('输入门限','threshold',-60,0,1,' dB')}{slider('音频块大小','block',80,2000,10,' ms')}<div className="notice">较小的块可能降低延迟，但需要更多计算能力；较大的块会显著增加通话延迟。无音高引导的模型可能不响应音高调节。使用索引前请检查模型提供者的说明。</div></section>}
 {page==='settings'&&<section className="panel"><h2>运行环境</h2><p>指向已安装依赖的 Python 解释器和 RVC 原项目目录。</p>{picker('Python 可执行文件','python')}{picker('RVC 项目目录','root',true)}<div className="row"><h3>音频设备</h3><button onClick={refresh} disabled={busy}><RefreshCw size={15}/>刷新设备</button></div>{selectDevice('输入麦克风','input')}{selectDevice('输出设备','output')}<label className="field"><span>采样率</span><select value={cfg.rate} onChange={e=>update('rate',Number(e.target.value))}><option value={48000}>48000 Hz</option><option value={44100}>44100 Hz</option></select></label><div className="notice">设备编号可能随连接状态变化，重新打开应用后会恢复系统默认设备，请重新选择。用于 QQ、Discord 或游戏时，输出选择虚拟音频线的播放端，再在目标应用中选择其录音端。虚拟驱动需自行安装。</div></section>}
 {page==='diagnostics'&&<section className="panel"><div className="row"><div><h2>运行诊断</h2><p>检查进程状态和最近日志。</p></div><button onClick={check}><RefreshCw size={15}/>刷新状态</button></div><pre>{log||'暂无诊断信息'}</pre><p>停止快捷键 Ctrl + Shift + F8：{shortcutAvailable===null?'状态未知':shortcutAvailable?'已注册':'未注册，可能被其他程序占用'}。关闭窗口后应用会留在系统托盘，可从托盘停止或退出。</p><p>进程运行不代表声音效果或音频链路正常，请检查日志并实际试听。</p></section>}
 {page==='help'&&<section className="panel guide"><h2>开始使用</h2><ol><li>按照项目 README 准备 Python、RVC 原项目及其必需资源。</li><li>在设置中选择 Python 和 RVC 目录，刷新并选择音频设备。</li><li>在音色库选择可信、已获授权的 .pth 模型及可选索引。</li><li>在调音工作台调整参数，返回主页启动，查看诊断日志。</li><li>如需在语音软件中使用，按虚拟音频设备的说明连接输出和输入。</li></ol><div className="notice">这是尚未完成设备验证的开发预览。请勿依赖它进行重要通话。仅使用获得授权的声音，避免冒充他人。</div></section>}
 </main></div>
}
export default App
