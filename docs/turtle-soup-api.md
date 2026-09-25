# 海龟汤接口约定

功能入口、当前状态模型和历史验收见[海龟汤维护文档](turtle-soup.md)。

所有路径以下以 `/api` 为前缀。使用现有 `client/src/api/client.ts`，保留 PoW、身份 Cookie、访客会话及自动认证恢复。不要新建一套认证。

## 创建、恢复和读取

`POST /game/start`

```json
{ "mode": "beginner", "variant": "turtle-soup" }
```

`mode` 为 beginner/easy/normal。相同身份、难度、玩法恢复同一局；普通模式和海龟汤可同时存在，互不覆盖。省略 variant 仍为 classic。

海龟汤创建、读取、操作成功均返回如下形状：

```ts
interface SoupGameView {
  gameId: string;
  mode: string;
  variant: 'turtle-soup';
  maxQuestions: 18;
  remainingQuestions: number;
  questionCount: number;
  guessCount: number;
  guessUnlocked: boolean;
  version: number; // 从 0 开始，每个新接受的操作 +1
  status: 'playing' | 'won' | 'lost';
  events: SoupEvent[];
  answer?: PlayerInfo; // 仅终局返回，含年龄、现役状态、Major 数等
  recorded?: boolean; // 仅终局有；false 表示结算频率限制下不计战绩
}
```

`GET /game/:id/state`：读取属于当前身份的海龟汤局。读取不延长活跃对局 30 分钟期限。结束后的结果回执保留 30 分钟，方便请求丢失后恢复；超期用永久战绩回放查询。

`GET /game/:id/question-options`：返回此局开局时的选项快照，保证本局输入/判断一致：

```ts
{ teams: string[]; countries: Array<{ nationality: string; region: string }> }
```

战队包含现役及历史队伍，空串表示无战队；国家按 `region` 分组。选项值使用数据库规范值，显示文案用现有地域/位置翻译工具。

选项覆盖所有有效选手，目标选择仍按所选难度。猜名联想继续使用 `/players/list`，只提交 ID。

## 操作与重试

以下三种操作都必须携带：

```ts
{ requestId: string /* UUID */, version: number /* 最近收到的版本 */ }
```

`POST /game/:id/question` 另外携带 `field` 和 `value`：

| field | value |
| --- | --- |
| team | 字符串，必须在本局 teams 中，可为空串 |
| nationality | 字符串，必须在本局 countries 中 |
| role | `Rifler` / `AWPer` / `Coach` |
| isActive | 布尔值，不能传字符串 |
| age | 1–120 的整数 |
| majorChampionships | 0–1000 的整数 |
| majorAppearances | 0–1000 的整数 |

例如：

```json
{
  "requestId": "7f62856d-8ed4-444b-8a83-660a556b8263",
  "version": 0,
  "field": "age",
  "value": 25
}
```

`POST /game/:id/guess`：另外携带 `{ playerId: number }`。只返回是否猜中，不返回普通模式的整行属性比较。

`POST /game/:id/giveup`：只携带 requestId/version。即使尚未提问也可以认输。

`POST /game/:id/exit`：空对象即可。清除活跃局，不记战绩；重复退出成功。重新开始先 exit，再 start。退出不是认输。

**请求重试规则：**

- 一次用户操作生成一个 UUID，保存完整请求；网络错误或 5xx 重试时，重复同一个 UUID、版本和内容。
- 相同操作不会重复扣次数；返回服务器当前状态，可能包含另一标签页更新后的更高版本。
- 同 UUID 更换内容或 action：409 `SOUP_REQUEST_CONFLICT`。
- 不同 UUID 但旧版本：409 `SOUP_STALE_STATE`；调用 state 同步，不自动把旧操作重新执行一次。
- 页面用服务器完整返回值替换本地状态，不自行累加计数。提交中禁止重复操作；可将待确认操作放进 sessionStorage，刷新后继续确认。
- 刷新时，有已知 gameId 应先 state；只有失效/不存在或明确新开时才 start。终局后直接 start 会开始下一局。
- 403/404 等明确失败不要当成网络错误无限重试。会话身份变化时清理旧身份的待确认请求。

前端在游戏页面保持本地 state：正常提问、猜名和认输只使用操作响应中的完整快照更新界面，不设置定时器，也不因焦点、可见性或跨标签事件反复读取 state。进入页面或刷新时读取一次已知 gameId；用户点击重试、恢复未确认操作或收到需要同步的明确错误时，才再次读取 state。

国家／地区候选在本地完成筛选，支持当前语言名称、服务端规范值、中文拼音全拼和拼音首字母；选项仍来自本局 `question-options` 快照，不会为搜索发送请求。鼠标点击或按 Enter/Tab 选中候选后直接提交一次提问。

每个新接受的问题消耗一次额度，解锁一次猜名；不会累计猜名额度。猜名不消耗提问额度，猜错锁定。第 18 问后仍为 playing，保留一次猜名，猜错才为 lost。

## 事件和错误码

```ts
type SoupEvent = {
  requestId: string;
  elapsedMs: number; // 距开局时间，毫秒
} & (
  | { type: 'question'; field: string; value: string | number | boolean;
      level: 'correct' | 'close' | 'wrong' }
  | { type: 'guess'; playerId: number; nickname: string; correct: boolean }
  | { type: 'giveup' }
);
```

显示为“是 / 是也不是 / 不是”，没有 higher/lower。显示问题时翻译字段名和规范值，不将用户输入拼接进 HTML。

| 状态 | code | 客户端行为 |
| --- | --- | --- |
| 400 | VALIDATION_FAILED | 格式或范围不合法；不扣次数 |
| 400 | SOUP_INVALID_OPTION | 选项不在本局列表；不扣次数 |
| 400 | SOUP_GUESS_LOCKED | 先提问再猜名 |
| 400 | SOUP_QUESTION_LIMIT | 只允许最后猜名或认输 |
| 400 | GAME_FINISHED | 同步 state 展示结果 |
| 400 | GAME_VARIANT_UNAVAILABLE | 当前接口不支持该局玩法 |
| 409 | SOUP_STALE_STATE | 同步 state 后显示最新局面 |
| 409 | SOUP_REQUEST_CONFLICT | 不要复用同 ID 发送不同操作 |
| 404 | GAME_NOT_FOUND | 过期、已退出或不属于当前身份；提示重新开始 |

其余身份、PoW、限流、Redis 错误沿用主游戏。结算沿用每身份每分钟最多记录 4 局的软限制，与普通单人共享额度；未记账的局依然显示答案和 recorded=false。

## 统计、排行榜与回放

- `GET /stats/me?variant=turtle-soup&difficulties=beginner,easy`
  - 与原统计结构一致，新增顶层 `variant` 和 `countMetric: 'questions'`。
  - `personal/global.totalGames/wins/winRate` 为海龟汤数据。
  - 为兼容现有统计组件，`avgGuesses` / `bestGuesses` 在海龟汤下分别表示获胜局平均提问数 / 最少提问数，请正确标注。
  - 兼容字段 `multiGames` 等仍描述原多人模式，海龟汤页面不要展示这些无关字段。
- `GET /leaderboard?mode=turtle-soup&difficulty=beginner`
  - 沿用 items/currentUser 结构，`countMetric: 'questions'`，`avgGuesses` 表示平均获胜提问数。
  - 不传新 mode 的旧请求仍只统计普通模式；功能开关 SHOW_LEADERBOARD 继续生效。
- `GET /stats/replays?type=single&variant=turtle-soup&page=1&pageSize=15`
  - 单人列表按玩法隔离，items 保持 `type: 'single'`，增加 `questionCount`，`guessCount` 仍为猜名次数。
  - 列表答案昵称来自本局快照。
- `GET /stats/games/:id/replay`
  - 根据记录自身 variant 分发，不需要 query 参数。
  - 海龟汤返回 `{ id, mode, variant, status, questionCount, guessCount, createdAt, finishedAt, answer, events, guesses: [] }`。
  - 使用 events 渲染，不能用空的 guesses 去画普通模式棋盘。
  - 仅所属访客/账号可读。管理员的 `/admin/users/:userId/games/:gameId/replay` 也返回相同海龟汤结构。

访客 `/auth/claim` 会归并海龟汤永久记录，刷新两个玩法的相关缓存。进行中的局仍按原身份和玩法隔离，不迁移 Redis 活跃对局。

后台用户 `/admin/users/:id/games?type=single` 和访客 `/admin/guests/:id/games?type=single` 列表保留各玩法记录，返回 `variant`、`questionCount` 和 `guessCount`。海龟汤答案昵称来自保存的 `answer_snapshot`；列表须标示玩法，并分别标注提问次数和猜名次数，不能用当前选手资料替换历史答案。
