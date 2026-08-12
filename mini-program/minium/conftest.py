import os
import minium


class MiniTestBase(minium.MiniTest):
    """师者小站 minium 基类"""

    def minitest_init(self):
        print("\n=== 测试套件开始 ===")

    def minitest_destroy(self):
        print("\n=== 测试套件结束 ===")

    def setUp(self):
        self.project_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "dist", "build", "mp-weixin")
        )
        os.makedirs(os.path.join(os.path.dirname(__file__), "reports"), exist_ok=True)

    def tearDown(self):
        try:
            if getattr(self, "app", None):
                self.app.verify()
        except Exception:
            pass
