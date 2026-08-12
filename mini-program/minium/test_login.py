import os
import time
from conftest import MiniTestBase


class TestLogin(MiniTestBase):
    """登录冒烟测试：覆盖超管/教师登录基础流程"""

    def test_login_page_loads(self):
        """登录页应能正常打开"""
        self.app.relaunch("/pages/login/login")
        time.sleep(1)
        page = self.app.get_current_page()
        self.assertIsNotNone(page, msg="登录页加载失败")
        save_path = os.path.join(os.path.dirname(__file__), "reports", "login_page.png")
        self.app.screen_shot(save_path)

    def test_super_admin_login(self):
        """超管账号 admin/admin 应能登录并跳转到管理页"""
        self.app.relaunch("/pages/login/login")
        time.sleep(1)
        page = self.app.get_current_page()
        self.assertIsNotNone(page, msg="登录页加载失败")

        # 以下选择器按 uni-app 常见结构编写，如果实际页面结构不同，可根据 get_current_page()
        # 返回的页面 XML 调整 selector。
        username = page.get_element("input[placeholder='请输入用户名']", auto_fix=False)
        username.input("admin")
        password = page.get_element("input[placeholder='请输入密码']", auto_fix=False)
        password.input("admin")

        # 登录按钮通常是主按钮，优先按 button 查找
        page.get_element("button[type='primary']", auto_fix=False).click()

        time.sleep(2)
        page = self.app.get_current_page()
        self.assertIsNotNone(page, msg="登录后页面信息为空")

        save_path = os.path.join(os.path.dirname(__file__), "reports", "after_login.png")
        self.app.screen_shot(save_path)
