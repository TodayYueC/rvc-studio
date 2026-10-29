# RVC Studio

**开发预览，尚不可作为完整产品使用。** 一个本地运行的 Windows 实时变声桌面应用原型。界面使用 Tauri 2、React 和 TypeScript；Python 适配器调用 RVC 原项目的实时推理引擎。支持的硬件取决于所安装的 RVC、PyTorch 及其后端；不要求特定型号的显卡。CUDA 是一种可选加速方式。

## 当前状态

Windows 预览版已在云端编译；本机已完成设备枚举、CUDA 检查，以及麦克风、真实模型和 VB-CABLE 之间的短时信号检查；全局停止快捷键已在本机测试。真实音质、长时间稳定性、QQ/Discord/游戏内链路尚待验证。音色库保存本地路径，提供一个带校验的可选模型下载。完善的引导和故障恢复尚未实现。不要将此预览用于重要通话。

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

音色库提供 AISO HOWATTO 的可选下载：下载前请在设置中选择 Python；应用从固定版本的公开镜像下载，校验 SHA-256 后保存到应用数据目录。若目标文件已存在且校验不符，应用会报错而不会覆盖它。

关闭窗口会隐藏到系统托盘；托盘菜单可以重新打开窗口、停止变声或退出。默认全局停止快捷键为 Ctrl+Shift+F8，注册状态显示在诊断页。托盘菜单尚未完成实际操作验证。

例如，[AISO HOWATTO 的发布说明](https://huggingface.co/wok000/vcclient_model/blob/c46962577db8cf3fba2b3fc3526af98eb6611840/rvc_v2_chihaya_jinja/description.txt)声明其模型为 MIT 许可，并说明训练声音提供者同意 AI 使用。模型由鶴乃制作、ちはや神社发行，发布说明列出的条件和署名应保留；这里不分发该文件。发布方建议该日语训练模型使用约 2 秒的块，索引混合设为 0。它没有音高引导，音高控制可能无效，较长的块也会明显增加延迟；中文效果需要自己试听。

## 许可与署名

本项目代码采用 MIT 许可证，见 [LICENSE](LICENSE)。运行时调用的 RVC 原项目采用 MIT 许可证，版权属于 liujing04、源文雨及 Ftps 等原作者；其源代码和许可见 [原项目](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI/blob/81eed5e8f68b6bed1789f682fe78cdd324495afc/LICENSE)。其他依赖、预训练资源和各个声音模型有各自条款，请在下载、使用或再分发前分别核查。见 [THIRD_PARTY.md](THIRD_PARTY.md)。本项目不附带模型或 RVC 权重。

请尊重声音所有者及使用场景的授权，勿用于冒充或欺骗。本软件按现状提供，不保证音质、延迟或特定设备兼容性。
