"""Local adapter for the RVC project's streaming inference engine."""
import json
import os
import sys
import traceback
from pathlib import Path

def validate(cfg):
    """Reject invalid settings before loading the expensive inference runtime."""
    root_text = str(cfg.get('root', '')).strip()
    model_text = str(cfg.get('model', '')).strip()
    if not root_text:
        raise ValueError('Choose the RVC project directory')
    root = Path(root_text).resolve()
    if not (root / 'RVCRealtimeVST/worker/rvc_worker.py').is_file():
        raise ValueError('RVC root does not contain RVCRealtimeVST/worker/rvc_worker.py')
    if not model_text:
        raise ValueError('Choose a .pth voice model')
    model = Path(model_text).resolve()
    if not model.is_file() or model.suffix.lower() != '.pth':
        raise ValueError('Select an existing .pth file')
    index_text = str(cfg.get('index', '')).strip()
    if index_text and (not Path(index_text).is_file() or Path(index_text).suffix.lower() != '.index'):
        raise ValueError('Select an existing .index file')
    if float(cfg['indexRate']) > 0 and not index_text:
        raise ValueError('Index mix requires an index file')
    if int(cfg['rate']) not in (44100, 48000):
        raise ValueError('Unsupported sample rate')
    if not 80 <= float(cfg['block']) <= 2000:
        raise ValueError('Audio block must be between 80 and 2000 ms')
    return root, model

def devices():
    import sounddevice as sd
    hosts = sd.query_hostapis()
    return [dict(id=i, name=d['name'], inputs=d['max_input_channels'], outputs=d['max_output_channels'], host=hosts[d['hostapi']]['name']) for i,d in enumerate(sd.query_devices())]

def run(cfg):
    root, model = validate(cfg)
    for resource in ('assets/hubert_base/config.json',
                     'assets/hubert_base/preprocessor_config.json',
                     'assets/hubert_base/pytorch_model.bin',
                     'assets/rmvpe/rmvpe.pt'):
        if not (root / resource).is_file():
            raise FileNotFoundError(f'Missing RVC inference resource: {root / resource}')
    import numpy as np
    import sounddevice as sd
    device = tuple(None if cfg[k] == -1 else cfg[k] for k in ('input','output'))
    sd.check_input_settings(device=device[0], channels=1, samplerate=cfg['rate'], dtype='float32')
    sd.check_output_settings(device=device[1], channels=1, samplerate=cfg['rate'], dtype='float32')
    print('Loading RVC model and inference resources...', flush=True)
    sys.path.insert(0, str(root / 'RVCRealtimeVST/worker'))
    from rvc_worker import RVCStreamEngine
    sys.argv = [sys.argv[0]]
    engine = RVCStreamEngine(dict(rvc_root=str(root),model_path=str(model),index_path=cfg['index'],sample_rate=cfg['rate'],block_ms=cfg['block'],crossfade_ms=40,extra_ms=1000))
    print(f'Inference device: {engine.config.device}', flush=True)
    engine.prewarm()
    def callback(indata, outdata, frames, timing, status):
        if status: print(str(status), flush=True)
        try:
            result = engine.process(indata.mean(axis=1), cfg['pitch'],cfg['formant'],cfg['indexRate'],1.0,cfg['threshold'],0)
            outdata[:] = np.asarray(result, dtype=np.float32).reshape(-1, 1)
        except Exception:
            outdata.fill(0)
            traceback.print_exc()
            raise sd.CallbackAbort
    with sd.Stream(device=device, samplerate=cfg['rate'],blocksize=engine.block_frame,channels=1,dtype='float32',callback=callback) as stream:
        print('Audio stream started', flush=True)
        while stream.active: sd.sleep(1000)
        raise RuntimeError('Audio stream stopped unexpectedly')

if __name__ == '__main__':
    try:
        if sys.argv[1] == 'devices': print(json.dumps(devices(),ensure_ascii=False))
        elif sys.argv[1] == 'run': run(json.loads(os.environ['RVC_STUDIO_CONFIG']))
        else: raise ValueError('Unknown command')
    except Exception:
        traceback.print_exc()
        sys.exit(1)
