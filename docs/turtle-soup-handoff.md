# 海龟汤开发交接：从第二阶段继续

## 先看这里

用户决定将工作拆成三个顺序任务。本次只交付**第一阶段：本地环境与后端**。

1. 第一阶段已完成：对局规则、接口、数据迁移、续玩、独立统计和排行榜、后端测试。
2. 下一任务负责第二阶段：游戏页面、统计和排行榜切换、回放、移动端、双主题和三语。
3. 第三阶段再做完整体验验收、生产环境兼容检查、截图和 PR。维护者合并后才安排部署。

不要重新规划玩法，也不要把第一阶段的完成误认为整个功能已完成。目前主页**没有**海龟汤入口，前端草稿尚未验收。

## 工作区和代码状态

- 工作目录：`F:\弗一把新模式弗龟汤`。
- 分支：`feat/turtle-soup`；起点为上游 `ad84398`（separate single game variants from difficulty）。
- `origin` 目前仍指向 `https://github.com/shnlfriberg/csgofriberg.git`。
- 当前 GitHub 登录账号检查时为 `SHISGAY114514`，只有主仓库读取权限。第三阶段使用 fork + 功能分支 PR，不直接推送主仓库 `main`。
- 本次提交只含后端、测试、环境脚本和文档，不含完整选手数据、账号密钥或下载的工具。

已有一份**未完成、未测试的前端草稿**，保存在本机 Git stash；不用重写已有基础组件：

```powershell
git stash show --stat --include-untracked ba48ddc3660812141bfff3c522f498bc764502e5
git stash apply ba48ddc3660812141bfff3c522f498bc764502e5
```

使用 `apply`，保留 stash 作为备份。草稿还备份为 `.local-data/frontend-draft.patch`，两种恢复方式只选一种。

草稿已有：首页入口、难度大厅、游戏页、问答列表、基础样式、三语文案、排行榜切换。**统计页和回放组件尚未接入**。草稿是在后端稳定前写的，需要核对下面的最终接口；不能直接当成完成品。特别检查网络失败后重试、刷新恢复、选项重新加载、多标签页同步，以及小屏输入区。

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

- 前端：`http://localhost:5173`（当前为原游戏 UI）。
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

## 第二阶段具体待办

1. 恢复并审查前端草稿，沿用主站组件和主题，不导入 demo 自带数据库。
2. 完成 `/turtle-soup`、`/turtle-soup/:mode` 全流程：提问输入、战队联想、按赛区分组国家、猜名锁定、最后一次机会、结算、重开/退出确认、规则说明。
3. 按 API 文档处理操作 ID/版本、请求重试、过期/跨标签页更新；刷新时先恢复已知 `gameId`，避免终局响应丢失时直接开新局。
4. `Stats` 增加玩法切换，统计和回放列表传 `variant=turtle-soup`。海龟汤视图不要显示普通模式的多人统计项。
5. `ReplayDialog` 扩展 `SingleReplay` 的玩法、`questionCount` 和事件列表；海龟汤使用 `SoupLog`，不能套用普通 `GuessBoard`。后台共用回放也按 `variant` 分发。
6. 排行榜使用 `mode=turtle-soup`，正确标注“平均获胜提问数”；沿用原有隐藏排行开关和个人名次展示。
7. 完善三个语言的页面及错误文案；测试手机宽度、键盘操作、深浅主题、0 次提问认输、18 问后的最终猜名。
8. 添加必要前端行为测试，通过客户端测试和构建；更新这份交接记录，交给第三阶段。

## 第一阶段验证结果

2026-09-25，本机 Windows + SQLite + Redis 7.4.3：

- 后端 **36 个测试文件、203 项测试通过**；海龟汤规则 **32 项**、API 集成 **10 项**，另有旧表迁移保留记录测试。
- 原前端 **30 个测试文件、127 项测试通过**。这不代表 stash 中的海龟汤草稿已测试。
- 完整 `pnpm build` 通过；沿用仓库预编译 PoW WASM。构建仅有原有 socket 动静态导入提示。
- 真实 HTTP 检查通过：未验证请求被 PoW 拦截 → 正常求解并验证 PoW → 建立访客会话 → 海龟汤开局/选项/提问/重复请求/恢复/退出。
- 完整日志：`.local-logs/all-tests.log`、`.local-logs/build.log`。

第三阶段仍需检查 PostgreSQL 实际迁移/生产镜像、前后端完整交互、移动端视觉、三语文案，以及 PR CI。**本阶段没有完成这些验收，也没有创建 PR 或部署。**

## 给下一个任务的提示词

> 请继续“弗一把海龟汤”的第二阶段，只完成页面与体验。工作区为 F:\弗一把新模式弗龟汤，使用现有 feat/turtle-soup 分支。先读 docs/turtle-soup-handoff.md 和 docs/turtle-soup-api.md，再按需读取相关实现。第一阶段后端和本地环境已完成，请复用，勿重新规划规则或重建数据。恢复文档中的前端草稿，完成游戏页、独立统计/排行榜/回放、三语与双主题移动端适配，运行相关测试和构建，完成后更新交接文档。PR 和部署留到第三阶段。
