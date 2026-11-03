# Math Daily

数学论文阅览室。独立仓库：[YijieMiao/math-daily](https://github.com/YijieMiao/math-daily)。

网站地址继续使用 **https://yijiemiao.github.io/math-daily/**，个人主页仓库不再负责本网站的更新。

## 阅读功能

- 自选 arXiv 全部 32 个数学分类；保留英文标题、摘要和公式。
- 同批次交叉论文去重，历史批次与曲线持续归档；支持每日/每周趋势。
- 收藏、已读、关注作者、方向选择保存在浏览器，兼容原有保存名称，可导出、导入与恢复备份。
- 分享方向组合与单篇论文，按最新公告或关注作者优先排序。
- RSS 使用 arXiv 官方多分类合并订阅，不包含本站私人阅读数据或 AI 标签。
- AI 披露按全文作者声明进行保守检索，附证据与覆盖率，不推算 AI 创作比例。

## 自动更新与发布

北京时间每天 **12:00、17:00** 检查 arXiv 数学 RSS（GitHub 定时可能延迟）。仅使用 GitHub 自带的工作流令牌，不需要 AI API Key。

论文抓取、AI 全文核查与发布相互独立。抓取后先发布论文，AI 核查每轮最多 200 篇，随后补充。所有论文、历史归档、AI 缓存均在 `data/`。

Pages Source 设为 **GitHub Actions**。发布前检查 Python 测试、JavaScript 语法与阅读数据兼容性、页面资源和归档一致性；发布包只含网站资源，不包含脚本、测试或工作流。成功发布的 SHA 保存于 `release.txt` 和工作流构件。

回退：Actions → **Restore Math Daily frontend** → 填写本仓库之前成功发布的 SHA。只恢复页面资源，保留当前 `data/`。原个人网站仓库的 SHA 不能用于本仓库回退。

## 本地运行与检查

```sh
python3 -m http.server 8765
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/test_reader_tools.cjs
python3 scripts/validate_math_release.py
python3 scripts/build_site.py
python3 scripts/validate_math_release.py --root _site
```

## 迁移记录

2026-11-03 从 `YijieMiao/YijieMiao.github.io` 提交 `8a8838e6833035d440775aa89da45ab5168964c5` 导入网站、全部归档和独立工具；不导入个人主页或其他文档。原地址、浏览器存储名称和分享参数保留。原仓库的历史提交不作重写；迁移完成后只移除其当前分支中的网站实现及更新任务。
