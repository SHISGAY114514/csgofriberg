# 海龟汤开发交接：第二阶段完成，第三阶段待接手

## 先看这里

用户将工作拆成三个顺序任务。**第一阶段后端与本地环境、第二阶段前端接入与交互验收均已完成**，本次没有部署、推送或创建 PR。

1. 第一阶段：对局规则、接口、数据迁移、续玩、独立统计和排行榜、后端测试。
2. 第二阶段：已恢复并审查草稿，完成大厅、游戏、独立战绩/排行榜/回放、三语与双主题适配、请求恢复和交互测试。
3. 第三阶段：真实手机/跨浏览器、生产兼容与完整发布验收、PR 和 CI；维护者合并后才安排部署。

首页入口按用户最新澄清：电脑宽屏（大于 900px）五个等宽入口同排；手机/窄屏恢复五个扁平按钮从上到下单列排列，不横向滑动。

### 后续调整：1080p 桌面紧凑布局

- 最新微调：桌面两栏适当分配窗口剩余高度，右侧字段均匀排布，让记录窗口底部到昵称输入框的留白约减半。例如 1920×960 内容区两栏高约 673px，1920×900 时约 634px；继续保持等高、一屏显示和手机原有尺寸。30 组浏览器尺寸／主题／语言检查及构建通过，日志为 `.local-logs/soup-spacing-browser.log`、`soup-spacing-build.log`。
- 桌面游戏页压缩卡片内边距、字段间距、输入框和提问按钮高度、规则按钮留白及记录行间距，两栏由约 859px 缩至约 606px；记录窗口继续与提问面板等高。手机保留原有控件尺寸。
- 独立无界面 Edge、设备缩放因子 1：1920×1080／960／900、1440×900 及 390×844 内容视口，双主题与三语共 30 组检查通过。桌面七项提问、认输和规则按钮均完整位于底部猜名栏上方，主内容区无需滚动；1920×900 为浏览器工具栏与系统任务栏预留空间。没有直接操作用户的最大化浏览器窗口。
- 连续 18 次真实提问及结算、记录独立滚动与高度稳定复验通过；完整 `pnpm build` 通过。本次仅调整 CSS，没有新增交互逻辑测试，前端 160 项为上一轮通过的测试基线。
- 本地证据（不提交）：`.local-logs/soup-compact-browser.log`、`soup-compact-metrics.json`、`soup-compact-history.log`、`soup-compact-build.log` 与 `compact-*.png`。

### 后续调整：记录窗口与最新反馈置顶

- 游戏页提问、反馈和猜名按最新到最早显示，保留原始事件编号；共享组件的历史回放仍按发生顺序展示服务端快照。
- 记录区为独立滚动窗口，标题固定在窗口外。桌面端与右侧提问面板等高，手机端使用紧凑固定高度；记录累积不再撑长主内容区。新事件只将记录窗口滚到顶部，不带动外层页面；结算在窗口顶部展示，也不会撑长页面。
- 前端 **32 个文件、160 项测试通过**；完整 `pnpm build` 通过。新增测试检查最新反馈置顶、原编号、只滚动内部窗口、不修改原始事件顺序；已有三语回放测试继续通过。
- 独立无界面 Edge 连续实际提问 18 次，确认每次最新事件置顶、外层滚动位置不变。1440／390／320px × 双主题 × 三语共 18 组检查确认记录前后页面及主内容区高度不变、内部可滚动、桌面两栏等高；结算窗口检查通过。真机触控与跨浏览器仍待第三阶段。
- 本地证据（不提交）：`.local-logs/soup-history-tests.log`、`soup-history-build.log`、`soup-history-browser.log`、`soup-history-metrics.json`、`history-*.png` 与 `.local-scripts/soup-history.cjs`。

### 后续调整：属性候选提示

- 位置（步枪手／狙击手／教练）与现役／退役保留直接下拉选择；战队、国家／地区改为输入非空白文字后显示匹配候选，最多 10 项。清空、移开焦点或 Escape 收起列表，支持方向键、Enter、Tab 和点击选择。
- 国家／地区支持当前语言显示名称与服务端原始名称匹配，并显示赛区；候选全部来自本局快照选项，提交仍使用原始值。无战队入口保留；未匹配文本不能提问。选择候选不发送请求，Enter 先完成选择，再次 Enter 或点击“提问”才提交；输入法组字时回车不提交。
- 完整 `pnpm test`：后端 203 项、前端 159 项通过；完整 `pnpm build` 通过。新增 5 项交互测试覆盖输入筛选、键盘与鼠标选择、无战队、三语原始值提交、非法文本及输入法回车。
- 独立无界面 Edge 访问现有本地前后端，1440／390px × 双主题 × 三语共 12 组通过；实际检查截图、手机触控模拟、空输入收起、候选宽度和页面无横向溢出、选择不发送请求、一次提问只记录一次。真机软键盘与输入法、Safari／Android 仍待第三阶段。
- 本地证据（不提交）：`.local-logs/soup-autocomplete-tests.log`、`soup-autocomplete-build.log`、`soup-autocomplete-browser.log` 与 `autocomplete-*.png`；验收脚本 `.local-scripts/soup-autocomplete.cjs`。

## 工作区和代码状态

- 工作目录：`F:\弗一把新模式弗龟汤`。
- 分支：`feat/turtle-soup`；起点为上游 `ad84398`（separate single game variants from difficulty）。
- `origin` 目前仍指向 `https://github.com/shnlfriberg/csgofriberg.git`。
- 当前 GitHub 登录账号检查时为 `SHISGAY114514`，只有主仓库读取权限。第三阶段使用 fork + 功能分支 PR，不直接推送主仓库 `main`。
- 第一阶段提交了后端、环境脚本和测试；第二阶段只修改前端、前端测试与交接文档，没有重建环境或重做后端。
- 不提交完整选手数据、账号密钥、下载工具、浏览器验收产物或本地数据库。

原草稿 stash 已通过 `git stash apply` 恢复、完善并纳入当前代码；**不要再次应用到现有代码**。原 stash 继续保留作为备份：

`ba48ddc3660812141bfff3c522f498bc764502e5`（`stash@{0}`）。本地补充备份仍为 `.local-data/frontend-draft.patch`。

## 已锁定的产品规则

- 单人模式，沿用 beginner/easy/normal 选手池；难度偏好独立，默认 beginner。
- 共 18 次提问，每次消耗 1 次，解锁一次免费猜名，不累计。可连续提问。
- 猜错锁定猜名，继续提问才能解锁；第 18 问后仍留一次猜名，猜错才失败。
- 战队、国家/地区、位置、状态、年龄、Major 冠军数、Major 出场数共七类提问。
- 和普通模式共享判断阈值：年龄差 ≤3，Major 数差 ≤1，同赛区、历史战队给 `close`。完全一致 `correct`，否则 `wrong`；不提供大小箭头。
- 随时可确认认输，记败局；主动退出/重新开始不记战绩。刷新续玩，30 分钟无有效写入过期。
- 有效重复提问仍扣次数；无效输入、重复网络请求、过期版本不扣次数。
- 统计/排行榜沿用现有外观；海龟汤和普通模式完全独立。平均和最佳次数计算**获胜局提问数**，猜名次数在详情中单列。
- 排名沿用胜场降序、胜率降序、局数降序、用户 ID 升序；前 50 名和当前用户名次。访客有战绩，登录归并后可以上榜；尊重隐藏排名设置。
- 新局使用主数据库；本局判断和回放使用开局快照，资料修改不改变当局反馈。

## 如何运行

本机已准备好 Node **26.10.0**、pnpm **11.13.1**、Redis **7.4.3**，都在 `.local-tools`，未安装全局工具或系统服务。

```powershell
# 本机已经 setup；新机器才需要执行这一行
pwsh -NoProfile -File scripts/local.ps1 -Action setup

pwsh -NoProfile -File scripts/local.ps1 -Action start
pwsh -NoProfile -File scripts/local.ps1 -Action stop
pwsh -NoProfile -File scripts/local.ps1 -Action backend-test
pwsh -NoProfile -File scripts/local.ps1 -Action test
pwsh -NoProfile -File scripts/local.ps1 -Action build
```

- 前端：`http://localhost:5173`（含海龟汤首页入口）。
- 后端：`http://localhost:3000`；健康检查 `/api/health` 应为 `ok: true, redis: up`。
- Redis：仅监听 `127.0.0.1:16379`；开发前缀 `csgofriberg-local:`。
- 开发数据库：`.local-data/development.sqlite3`。2026-09-25 按用户要求更新为 **668 条选手记录：646 条启用、22 条停用**，与生产隔离。原 646 条记录已更新，新增 22 条，保留来源文件的停用标记。
- 日志：`.local-logs/`。本地密钥由脚本生成，留在 `.local-data/`，不要打印/提交。
- 测试每次使用新的 SQLite 文件和 Redis 前缀，避免污染开发数据。测试环境 `REDIS_REQUIRED=false` 是为了让原有内存回退单元测试通过；集成测试仍使用真实 Redis，开发服务则强制 Redis 可用。
- Windows 的 `better-sqlite3` 安装可能打印可选编译失败；本机包内的预编译绑定已实测可用，setup 最后会执行 SQLite 查询检查，不需要为此改依赖。
- Windows Redis 使用独立开发构建；生产仍沿用仓库原有 Linux Redis/PostgreSQL 部署。

**当前数据来源**是用户提供的更新文件 `E:\Users\Administrator\Downloads\players.json`，已复制到 `.local-data/players.json` 并导入。此前使用的 `shnlfriberg/csgo-major-db` 快照已被替换。所有资料、战队历史、难度关系及启停状态已逐项核对；导出的 `playerId` 不覆盖本地内部 ID，以保留既有账号和对局关联。

导入时间、来源路径和 SHA-256 记录在 `.local-data/players-provenance.json`；导入前数据库及 JSON 备份位于 `.local-data/backups/`。本地测试管理员凭据保存在 `.local-data/test-admin.json`，本次数据更新保留该账号。

此文件是本地测试数据快照，不会自动同步源文件。不要把数据文件、凭据、工具目录或本地数据库提交进 PR。需要重导入时执行：

```powershell
pwsh -NoProfile -File scripts/local.ps1 -Action import -PlayersFile .local-data/players.json
```

导入走原有校验/upsert 逻辑。首次完整导入不先加入五人演示数据，避免种子昵称大小写差异产生额外选手。

## 后端入口：按需阅读，不用重新扫描仓库

| 关注点 | 入口 |
| --- | --- |
| 完整请求与响应约定 | `docs/turtle-soup-api.md` |
| 属性判断、事件、快照、返回视图 | `server/src/services/turtleSoup.ts`；共享阈值在 `gameService.ts` |
| 路由、操作幂等、结算回执 | `server/src/routes/game.ts` |
| Redis 状态及按玩法恢复 | `server/src/services/singleGameStore.ts` |
| 统计/历史/排行榜 | `server/src/routes/stats.ts`、`leaderboard.ts` |
| 必须保持的行为和示例 | `server/test/routes/turtleSoup.integration.test.ts`、`server/test/services/turtleSoup.test.ts` |

兼容性处理已经包括：`games.variant` 隔离、缓存按玩法区分、访客归并后刷新海龟汤缓存、普通个人战绩和后台普通排名排除海龟汤、外部普通猜测作弊分析排除海龟汤，以及后台回放返回海龟汤事件。

`games` 新增 `question_count`、`soup_events`、`answer_snapshot`。原 `guess_count` 保持“猜名次数”含义，统计层对海龟汤改用 `question_count`。迁移可重复执行，旧记录仍为 `classic`。

## 第二阶段实现与验收（2026-09-25）

后续规则入口调整（同日）：首页“游戏规则”新增海龟汤独立章节；海龟汤大厅和游戏页改为居中“玩法规则”按钮，打开屏幕居中的规则弹窗。三个入口共用同一份中/英/日规则文案；海龟汤弹窗只显示本玩法，不混入普通模式的箭头提示与 8 次猜测说明。支持 Esc 关闭、焦点返回及弹窗内键盘焦点约束。前端 **32 个文件、154 项测试通过**，完整构建通过；Edge 无界面浏览器验证了 1440/390px × 双主题 × 三语的 12 组首页规则内容和海龟汤按钮/弹窗居中，并确认游戏页查看规则不消耗次数。输出在 `.local-logs/soup-rules-tests.log`、`.local-logs/soup-rules-build.log`，截图为 `.local-logs/rules-*.png`。

- 首页大屏五列同排，小屏五个扁平按钮纵向单列；保留每日挑战首位，海龟汤为第五个入口。
- `/turtle-soup` 难度大厅，独立记忆难度、默认入门；`/turtle-soup/:mode` 七种属性提问、规范战队联想、按赛区分组国家、免费猜名/锁定、18 问后的最终猜名、认输/退出/重开确认、规则和答案快照结算。
- `Stats` 以 `variant=turtle-soup` 隔离汇总与回放；不展示普通多人和首猜统计。平均/最佳显示获胜局提问数，列表单独展示猜名数。
- `Leaderboard` 以 `mode=turtle-soup` 查询，沿用原表格、难度筛选和当前用户排名。战绩/排行切换保存在 URL，切换与迟到响应不会混淆玩法；读取失败有明确重试入口。
- 共用 `ReplayDialog` 按记录的 variant 渲染海龟汤 `SoupLog`，个人与后台共用。只使用接口保存的答案和事件，按事件顺序显示属性、反馈、猜名/认输，不重新查询或判断历史答案。
- `useTurtleSoup` 管理请求与恢复：一项操作只创建一个 UUID，保留版本与完整负载；网络/5xx 不确认时保存至 sessionStorage。刷新先 GET 已知 gameId 的 state，已确认事件不重发；未确认事件用原负载重试。409 丢弃旧操作并同步，明确失败不无限重发。
- 服务端完整返回值替换本地计数；同步中锁定输入。多标签页通过 storage 通知、回到前台和 15 秒只读轮询同步；迟到读请求不能覆盖新版本或清空未确认操作。读取不续期，过期后显示重新开始提示。身份初始化先完成，实际账号切换清理旧会话待确认请求。
- 所有新页面、反馈、规则、确认、错误、战绩与回放有中/英/日文案；兼容 light/blast 主题、小屏滚动记录、底部猜名输入与安全区。

### 测试结果

通过既有 `scripts/local.ps1` 使用本地 Node/pnpm，最终执行完整 `pnpm test` 和 `pnpm build`：

- 后端：**36 个测试文件，203 项通过**。
- 前端：**32 个测试文件，153 项通过**（第一阶段 127 项，本次新增 26 项）。
- 构建：PoW、客户端 TypeScript/Vite、服务端 TypeScript 均通过；保留原 socket 动/静态导入提示。
- 新测试覆盖难度偏好隔离、非法路由、解锁/锁定、最后一次猜名、重复提交、网络/503 原操作重试、刷新终局恢复、409 同步、403 不重放、选项重载、多标签页、迟到读取、过期、0 问认输、退出/重开、身份切换、独立统计/排行、三语快照回放及读取失败重试。
- 完整输出：`.local-logs/stage2-tests.log`、`.local-logs/stage2-build.log`。

### 实际浏览器检查

使用现有 Edge 的独立无界面浏览器会话访问真实 `localhost:5173` 与现有后端/Redis/SQLite，未使用用户日常浏览器身份，也未更改现有账号、选手或历史记录。验收产生少量独立匿名访客对局记录。

- 真实流程通过：属性/布尔提问、猜错后锁定、刷新续玩、请求未送达重试、请求已接受但响应丢失后恢复、两个标签页同时写入得到 200/409 且只扣一次、18 问后保留猜名并在猜错后失败、猜中、终局响应丢失后的刷新恢复、0 问认输、退出不计战绩、独立胜率/平均获胜提问数和快照回放。
- 为稳定驱动猜中/猜错，验收脚本只读其自身匿名测试局 Redis 快照；前端没有读取隐藏答案的接口或代码。
- 过期用**仅本次测试创建的匿名对局**缩短 Redis TTL 到 1 秒验证，前端显示过期提示并经明确点击再开局；没有等待真实 30 分钟，也没有改动其他局或服务端过期配置。
- 首页/大厅/游戏/排行榜：1440、390、320px × 双主题 × 三语，18 组布局检查通过；当时首页为五个入口单行，游戏内容无页面横向溢出；后续用户澄清手机需恢复纵向布局，以文件开头的最新约定为准。检查实际截图并修正了小屏长标题截断。
- 结算、含真实数据的战绩与快照回放：1440、390px × 双主题 × 三语，12 组截图检查通过。窄屏底部输入还验证了视口高度压到 500px 的键盘近似场景。
- 密集刷新验收中曾出现开局/回放等待超时；分组重跑均通过。截图明确观察到统计汇总限流后的错误态，既有 `/stats/me` 限制为每身份每分钟 10 次；最终改用已载入数据切换主题/语言完成全部汇总截图，未放宽后端限流。开局等待超时未单独复现归因。
- 本地证据：`.local-logs/soup-flow-result.json`、`.local-logs/soup-layout-320-result.json`、`.local-logs/soup-stats-layout-result.json`、`.local-logs/soup-recovery-final-result.json`，以及 `.local-logs/soup-*.png`。本地验收脚本在 `.local-scripts/soup-*.cjs`，临时 Playwright 依赖在 `.local-tools/frontend-qa`，均不提交。
- 数据复核仍为 **668 条：646 启用、22 禁用，1 个原有账号**；未导入旧数据、未修改现有凭据。

### 未验证与第三阶段待办

1. 真机 iOS/Safari、Android、原生软键盘/输入法、触控和无障碍设备；本次只有 Edge 浏览器移动尺寸/触控参数与键盘视口模拟。
2. 用户日常浏览器中的人工逐项体验验收。Computer Use 因无法可靠识别当前浏览器 URL 停止，本次没有继续进行 Windows UI 自动操作；替代验证是独立无界面本地浏览器。
3. 真实 30 分钟无操作计时、长时间多标签页/弱网压力；本次使用实际接口、受控响应丢失和缩短单个测试局 TTL。
4. 浏览器中的账号登录/登出、访客战绩归并、隐藏排名和后台海龟汤回放端到端串联；本次身份切换与共用回放组件有前端测试，后端原覆盖继续通过，但没有操作现有账号做这些完整人工验收。
5. PostgreSQL 实际迁移、生产镜像、缓存/代理/PoW 环境兼容、发布构建体验和 PR CI。准备最终截图与 PR，按原计划走 fork + 功能分支，不直接推送上游 main；部署等维护者合并后另行安排。

### 本地试玩

- 首页：`http://localhost:5173`（五入口单行）。
- 大厅：`http://localhost:5173/turtle-soup`。
- 入门：`http://localhost:5173/turtle-soup/beginner`。
- 战绩/回放：`http://localhost:5173/stats?variant=turtle-soup`。
- 排行榜：`http://localhost:5173/leaderboard?mode=turtle-soup`。

## 第一阶段验证结果

2026-09-25，本机 Windows + SQLite + Redis 7.4.3：

- 后端 **36 个测试文件、203 项测试通过**；海龟汤规则 **32 项**、API 集成 **10 项**，另有旧表迁移保留记录测试。
- 原前端 **30 个测试文件、127 项测试通过**。这不代表 stash 中的海龟汤草稿已测试。
- 完整 `pnpm build` 通过；沿用仓库预编译 PoW WASM。构建仅有原有 socket 动静态导入提示。
- 真实 HTTP 检查通过：未验证请求被 PoW 拦截 → 正常求解并验证 PoW → 建立访客会话 → 海龟汤开局/选项/提问/重复请求/恢复/退出。
- 完整日志：`.local-logs/all-tests.log`、`.local-logs/build.log`。

以上是第一阶段的历史结果；第二阶段结果与剩余验收范围以本文件上方记录为准。

## 给下一个任务的提示词

> 请继续“弗一把海龟汤”的第三阶段。工作区为 F:\弗一把新模式弗龟汤，分支 feat/turtle-soup。先读 docs/turtle-soup-handoff.md、docs/turtle-soup-api.md 和适用 AGENTS.md。前两阶段已经完成，先检查 Git 状态，不要再次应用前端 stash，不重建数据或环境。完成文档列出的真实设备、账号串联、生产兼容与发布验收，再根据用户授权准备 fork 分支 PR 和 CI；不要直接推送上游 main，部署等维护者合并后另行安排。
