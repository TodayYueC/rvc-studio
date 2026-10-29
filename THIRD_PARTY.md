# Third-party components

RVC Studio invokes the external [RVC project](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) at commit `81eed5e8f68b6bed1789f682fe78cdd324495afc`. That project's MIT license includes copyright notices for liujing04, 源文雨, and Ftps. Its complete license is in the external checkout; it is not incorporated into this source tree.

RVC's documented inference resources can be obtained from [lj1995/VoiceConversionWebUI](https://huggingface.co/lj1995/VoiceConversionWebUI). Its model card declares MIT at repository level. The assets are downloaded separately, not distributed in this repository. Their provenance and applicable rights should be checked before redistribution; a repository-level tag does not establish the rights for independently sourced voice models.

The application also depends on Tauri, React, Tailwind CSS, Motion, Lucide, Python, PyTorch, and other packages, each under its own license. `pnpm licenses list` lists installed frontend dependency metadata. This is not a complete license audit of a future packaged binary; review the exact Rust, Python, native and model dependencies and include any required notices before distributing a release.

The button component was adapted from [shadcn/ui](https://github.com/shadcn-ui/ui), copyright 2023 shadcn, under the MIT license. The license text is preserved in `third_party/shadcn-ui-LICENSE.txt`.
