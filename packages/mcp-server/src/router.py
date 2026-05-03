"""规则驱动路由层"""

import re


def route(text: str) -> str:
    t = text.strip().lower()

    # → mem0: 显式记住指令
    if re.search(
        r"记住|请注意|以后要知道|牢记|永远记住|"
        r"保存|存一下|记下来|别忘了|记录|保留|标记",
        t,
    ):
        return "mem0"

    # → mem0: 偏好/规则/约定
    if re.search(
        r"用|要用|不要用|首选用|请用|建议用|倾向于|"
        r"偏好|喜欢|习惯|风格|命名|格式|"
        r"规范|规则|约定|标准|推荐",
        t,
    ):
        return "mem0"

    # → mem0: 身份/背景/事实
    if re.search(
        r"我是|我叫|我是一名|我在做|我的项目|"
        r"这个项目|这里是|使用了|采用了|基于|"
        r"依赖|版本|地址|端口",
        t,
    ):
        return "mem0"

    # → mem0: 解法/知识
    if re.search(
        r"怎么解决|怎么修|如何修复|如何解决|怎么处理|"
        r"解法|解决方案|解决办法|修复方案|最佳实践|"
        r"之前怎么处理|当时怎么搞|有没有遇到过|遇到过吗",
        t,
    ):
        return "mem0"

    # → mem0: 任务状态
    if re.search(
        r"待办|todo|待处理|任务|事项|"
        r"卡在|卡住|阻塞|受阻|停滞|"
        r"还没做|未完成|还没完成|"
        r"下一步|接下来要做|需要做|需要完成|"
        r"进度|状态|进展",
        t,
    ):
        return "mem0"

    # → Markdown: 时间指示词
    if re.search(
        r"昨天|前天|上周|上个月|上星期|"
        r"上次|上回|之前|以前|过去|历史|"
        r"最近|刚才|刚刚|前几天|前几次|"
        r"当时|那时候|那天",
        t,
    ):
        return "markdown"

    # → Markdown: 行为回溯
    if re.search(
        r"之前讨论|之前说过|之前聊过|之前做过|之前提到|"
        r"上次我们|上次会话|上次聊天|上次讨论|"
        r"做了什么|发生了什么|讨论了什么",
        t,
    ):
        return "markdown"

    # → Markdown: 决策回溯
    if re.search(
        r"怎么决定|为什么选|为什么决定|决策原因|"
        r"试过|尝试过|踩过坑|"
        r"回顾|复盘|回看|查看历史",
        t,
    ):
        return "markdown"

    # 默认 → mem0
    return "mem0"
