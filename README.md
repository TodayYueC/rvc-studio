# RVC Studio

**开发预览，尚不可作为完整产品使用。** 一个本地运行的 Windows 实时变声桌面应用原型。界面使用 Tauri 2、React 和 TypeScript；Python 适配器调用 RVC 原项目的实时推理引擎。支持的硬件取决于所安装的 RVC、PyTorch 及其后端；不要求特定型号的显卡。CUDA 是一种可选加速方式。

## 当前状态

前端可构建；设备枚举和配置校验已检查。Tauri 程序、模型加载、实际推理、实时音频、虚拟麦克风、QQ/Discord/游戏链路尚待端到端验证。音色库保存本地路径；托盘和停止快捷键已编写但尚未在桌面程序中验证。模型下载、完善的引导和故障恢复尚未实现。不要将此预览用于重要通话。

## 前置条件

- Windows 11、WebView2、Node.js、pnpm、Rust MSVC 工具链、Visual C++ Build Tools 和 Windows SDK。参见 [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/)。
- 单独准备 [RVC 原项目](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI)，本原型适配提交 `81eed5e8f68b6bed1789f682fe78cdd324495afc` 的 `RVCRealtimeVST/worker/rvc_worker.py`。按原项目文档安装 Python 3.12 依赖和推理资源；不同版本的接口可能不兼容。需要 `assets/hubert_base/config.json`、`preprocessor_config.json`、`pytorch_model.bin` 和 `assets/rmvpe/rmvpe.pt`；这些是推理组件，并非音色模型。
- 自备可信的、获得使用许可的 RVC `.pth` 模型和可选的 `.index` 文件。模型权利不由本项目授予。模型文件可能包含可执行的反序列化内容，请勿加载不可信文件。
- 如需把声音送到其他应用，需要单独安装兼容的虚拟音频设备。选择该设备的播放端作为本应用输出，并在目标应用中选择其对应录音端。安装驱动前请查阅提供者说明。

## 构建与使用

```powershell
pnpm install
pnpm tauri dev
pnpm tauri build
```

在设置中选择安装了 RVC 依赖的 Python 解释器和 RVC 根目录，刷新设备并选择输入、输出；在音色库选择模型；调整参数后启动。诊断页显示引擎日志。该流程尚未完成端到端验证。

设备编号可能在重新连接后变化，因此每次重新打开应用或刷新列表时都需要重新选择设备。音色库保存路径而不是复制文件；移动文件后需要重新选择。

关闭窗口会隐藏到系统托盘；托盘菜单可以重新打开窗口、停止变声或退出。默认全局停止快捷键为 Ctrl+Shift+F8，注册状态显示在诊断页。托盘和快捷键尚未完成实际设备验证。

## 许可与署名

本项目代码采用 MIT 许可证，见 [LICENSE](LICENSE)。运行时调用的 RVC 原项目采用 MIT 许可证，版权属于 liujing04、源文雨及 Ftps 等原作者；其源代码和许可见 [原项目](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI/blob/81eed5e8f68b6bed1789f682fe78cdd324495afc/LICENSE)。其他依赖、预训练资源和各个声音模型有各自条款，请在下载、使用或再分发前分别核查。见 [THIRD_PARTY.md](THIRD_PARTY.md)。本项目不附带模型或 RVC 权重。

请尊重声音所有者及使用场景的授权，勿用于冒充或欺骗。本软件按现状提供，不保证音质、延迟或特定设备兼容性。
