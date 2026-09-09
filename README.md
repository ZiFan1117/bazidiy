# BaziDIY 八字五行手串定制

基于 [DeepSeek Harness（dsh）](https://github.com/deepseek-ai/deepseek-harness) 的八字五行手串定制助手。把「八字排盘 → 喜用神 → 珠子匹配 → 款式方案」这一套需要专业玄学与工艺知识的手艺，做成一个 AI 可用的插件，让用户通过对话即可定制一条五行手串。

> 本项目是 dsh 的插件集合，依赖 dsh 运行（`@deepseek-ai/dsh-*` 0.1.1-rc.x）。不包含 dsh 本体，也不内置任何 API Key——模型 Key 由使用者在 dsh 层自行配置。

## 设计理念：确定性工具 + LLM 编排

AI 大模型是「概率生成」，直接让它算八字、配珠子，会一本正经地胡说八道。本项目的核心原则是分层：

| 层 | 谁来管 | 说明 |
|---|---|---|
| **对不对**（八字排盘、五行喜用神、珠子匹配、款式求解） | 确定性工具（代码） | 有客观对错，由规则引擎精确计算，禁止 LLM 自算 |
| **好不好**（怎么解释、怎么推荐、说话的温度） | LLM | AI 只负责编排流程、解释结果、做个性化推荐 |

一句话：**把「算账」交给工具，把「聊天」交给 AI。**

## 架构

```
dsh 内核（agent-loop + session-log + tools 注册表 + LLM 适配 + Web UI）
        ▲                              ▲
        │ preset 组合                   │ client 插件
        │ agent.cordis.yml              │ @bazidiy/ontology/client
   ┌────┴────────────┐           ┌──────┴─────────────┐
   │ 手串定制助手角色 │           │ 手串 SVG 渲染       │
   │ （编排 + 话术）  │           │ 换珠子编辑器        │
   └─────────────────┘           └────────────────────┘
        │ 调用工具
        ▼
   @bazidiy/ontology（host 半区）
   5 个确定性工具 + 珠子数据 + 静态资源
```

## 目录结构

```
atoms/                       # 【唯一真源】每个原子一个文件夹：文档+代码+测试+资源 同夹
  bazidiy.kb/                # 知识本体原子：atom.md · impl/(绑定) · tests/ · assets/beads(35图)
  bazidiy.calculate_chart/   #   · tools/
  bazidiy.infer_verdict/     #  （…其余每个原子同构：atom.md · detail.json · impl/ · tests/）
  …（共 16 个 bazidiy.* 原子）＋ bazidiy.plugin/   # 插件装配原子：impl/(壳代码) · pkg/(打包配置)
  __shared/                  # 跨原子共享（bazidiy.framework 契约/判据 + 集成测试）
tools/
  sync-atoms.mjs             # 原子真源 → 组装 .build/ontology（src/_atoms + tests + assets + persona）
  gen-ossie-db.mjs           # 建库+自检（源在 atoms/bazidiy.kb/kb/ossie/data）
  gen-bindings.mjs           # DB → atoms/bazidiy.kb/impl 绑定 + kb/*.ttl
  ossie-validate.mjs         # Apache Ossie 官方 validator（4 文档闸）
  contract-check.mjs         # 原子契约回归（先跑 sync 组装 .build）
  check-imports.mjs          # 引用纪律：原子真源只允许相对/裸包 import
  check-encoding.mjs         # 编码闸：UTF-8 无 BOM + 无 GBK mojibake 残码
  check-deps.mjs             # 依赖透明闸：atom.md/detail.json 的 deps == 真实 import（--fix 回写）
.build/ontology              # 组装视图（gitignore；发布/打包输入）
dist/                        # 产物（tgz）
```

> 规则：**改代码/测试/资源只动 `atoms/<id>/…`**；发布/回归前 `node tools/sync-atoms.mjs`。桌面插件由组装视图打包，桌面端安装为快照不受重构影响。

## 五个工具

| 工具 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `calculate_bazi` | 公历生日、时辰、性别 | `bazi_result` | 八字四柱 + 日主五行 |
| `propose_designs` | 珠子限定、腕围、日主五行、月支五行 | `design_proposal` | 喜用神 + 珠子分类 + 款式方案 |
| `generate_design` | 款式、珠子序列、腕围、说明 | `design_result` | 最终手串方案（校验珠子全称） |
| `save_design` | 方案数据 | `design_saved` | 按会话保存方案 |
| `load_design` | — | `design_loaded` | 恢复当前会话的方案 |

工具只做确定性计算，不调 LLM。`generate_design` 会拒绝缩写珠子名（如「小叶紫檀」必须全称）。

## 角色（preset）

`atoms/bazidiy.assistant_preset/impl/agent.cordis.yml` 定义了一个「手串定制助手」角色（persona），通过 system prompt 约束 AI：

- **严格流程**：缺信息先问 → 算八字 → 提方案 → 用户确认款式 → 出图 → 用户想换则换款（不重算八字）
- **硬约束**：禁止 AI 自己算旺衰/编造珠子名/展示八字内部细节/每次回复超过 150 字
- **AI 的自由**：从工具返回的多个方案里挑最合适的、用通俗话解释五行、按用户偏好换款

## 在 dsh 中加载

本项目是 dsh 的插件，需在 dsh 环境内加载（开发源码或对应 npm 包环境）：

1. 将 `packages/ontology` 作为 dsh 的 workspace 包（或 npm 依赖）加入
2. 在 dsh 的 `packages/bundle/web-app/cordis.patch.yml` 挂载 client 半区（`name: '@bazidiy/ontology'`）
3. 将 `atoms/bazidiy.assistant_preset/impl`（agent.cordis.yml + preset.yml）放进 dsh 的 preset 扫描目录（如桌面端 `~/.dsh/.agent-presets/bazidiy/`），新会话即可选「八字手串定制」persona。

依赖的 dsh 包（peerDependencies）：`@deepseek-ai/dsh-tools`、`dsh-host-webserver`、`dsh-storage-domain`、`dsh-client-ui-tool`、`dsh-client-ui-slots`、`dsh-client-runtime` 等（对应 dsh 0.1.1-rc.x）。

## 模型 Key

本项目**不内置、不管理任何 API Key**。使用者在 dsh 层通过环境变量 `DEEPSEEK_API_KEY`（优先级最高）或 dsh 的凭据文件配置自己的 Key，与插件完全解耦。

## 许可

[GPL-3.0](LICENSE) © BaziDIY
