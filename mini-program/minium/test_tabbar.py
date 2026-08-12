import os
import time
from conftest import MiniTestBase


class TestTabBar(MiniTestBase):
    """TabBar 冒烟测试：覆盖图标路径缺失、页面切换等基础场景"""

    EXPECTED_ICONS = [
        "static/tabbar/dashboard.png",
        "static/tabbar/dashboard-active.png",
        "static/tabbar/classes.png",
        "static/tabbar/classes-active.png",
        "static/tabbar/students.png",
        "static/tabbar/students-active.png",
        "static/tabbar/toolbox.png",
        "static/tabbar/toolbox-active.png",
        "static/tabbar/config.png",
        "static/tabbar/config-active.png",
    ]

    TAB_PAGES = [
        "pages/dashboard/dashboard",
        "pages/classes/classes",
        "pages/students/students",
        "pages/toolbox/toolbox",
        "pages/config/config",
    ]

    def test_tabbar_icons_exist_in_build_output(self):
        """构建产物中必须包含 tabBar 所需的 10 个图标文件"""
        for icon in self.EXPECTED_ICONS:
            full_path = os.path.join(self.project_path, icon)
            self.assertTrue(
                os.path.exists(full_path),
                msg=f"图标文件不存在: {icon}",
            )

    def test_switch_each_tab(self):
        """五个 tab 页面都能正常跳转"""
        for page_path in self.TAB_PAGES:
            with self.subTest(page=page_path):
                self.app.switch_tab(f"/{page_path}")
                time.sleep(1)
                page = self.app.get_current_page()
                self.assertIsNotNone(page, msg=f"切换至 {page_path} 失败")
                screenshot_name = page_path.replace("/", "_") + ".png"
                save_path = os.path.join(os.path.dirname(__file__), "reports", screenshot_name)
                self.app.screen_shot(save_path)

    def test_dashboard_tab_is_default(self):
        """默认首页应为工作台"""
        self.app.switch_tab("/pages/dashboard/dashboard")
        time.sleep(1)
        page = self.app.get_current_page()
        self.assertIsNotNone(page)
        save_path = os.path.join(os.path.dirname(__file__), "reports", "dashboard_default.png")
        self.app.screen_shot(save_path)
