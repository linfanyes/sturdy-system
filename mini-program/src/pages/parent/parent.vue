<template>
  <view class="page" :class="{ dark }">
    <!-- 错误/重试态（与 Web 端一致） -->
    <view class="load-err" v-if="loadError" @tap="load">⚠️ 数据加载失败，点击重试</view>
    <!-- 加载态（与 Web 端 spinner 对齐） -->
    <view class="loading-mask" v-if="loading">
      <view class="spinner"></view>
      <text class="loading-text">加载中…</text>
    </view>
    <view class="hd">
      <view class="t">🏡 家长中心</view>
      <view class="hd-actions">
        <text class="out" @click="bindPhone">📱 绑定</text>
        <text class="out" @click="showPwdModal = true">🔑 改密</text>
        <text class="out" @click="logout">退出</text>
      </view>
    </view>

    <!-- 孩子选择条（多娃时显示） -->
    <view class="kid-selector" v-if="me?.kids && me.kids.length > 1">
      <view class="kid-chips">
        <view
          v-for="kid in me.kids" :key="kid.studentId"
          class="kid-chip"
          :class="{ active: kid.studentId === activeKidId }"
          @tap="switchToKid(kid.studentId)"
        >
          {{ kid.studentName }}
        </view>
        <!-- 跨娃比对入口 -->
        <view class="compare-btn" @tap="goCompare" v-if="me.kids.length > 1">
          📊 跨娃比对
        </view>
      </view>
    </view>

    <view class="kids" v-if="kids.length">
      <view class="kid" v-for="k in kids" :key="k.studentId">
        <view class="kn">{{ k.studentName }}<text v-if="k.studentNo" class="sno"> · {{ k.studentNo }}</text></view>
        <view class="kc">{{ k.parentName ? k.parentName + ' · ' : '' }}{{ k.className || '班级 ' + k.classId }}<text v-if="k.nickName" class="wechat-badge">已微信绑 {{ k.nickName }}</text></view>
      </view>
    </view>

    <!-- 顶部统计卡片（与 Web 端对齐，点击查看详情） -->
    <view class="stats-row" v-if="!loading">
      <view class="stat-card clickable" @tap="tab = 'pending'">
        <view class="stat-label">📢 待读通知</view>
        <view class="stat-value">{{ stats.notices }}</view>
      </view>
      <view class="stat-card clickable" @tap="tab = 'pending'">
        <view class="stat-label">📝 待完成作业</view>
        <view class="stat-value">{{ stats.homework }}</view>
      </view>
      <view class="stat-card clickable" @tap="tab = 'scores'">
        <view class="stat-label">📊 考试次数</view>
        <view class="stat-value">{{ stats.exams }}</view>
      </view>
      <view class="stat-card clickable" @tap="tab = 'scores'">
        <view class="stat-label">🏆 最新排名</view>
        <view class="stat-value">{{ stats.rank }}</view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <text class="tab" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">📋 待办公告</text>
      <text class="tab" :class="{ on: tab === 'scores' }" @click="tab = 'scores'">📊 成绩查询</text>
      <text class="tab" :class="{ on: tab === 'attendance' }" @click="tab = 'attendance'">📈 考勤</text>
      <text class="tab" :class="{ on: tab === 'overview' }" @click="tab = 'overview'">💡 总览</text>
    </view>

    <!-- 订阅消息引导 -->
    <view class="subscribe-card" v-if="showSubscribeGuide">
      <view class="sub-icon">🔔</view>
      <view class="sub-text">
        <text class="sub-title">开启通知订阅</text>
        <text class="sub-desc">作业提醒、新公告、成绩发布即时推送到微信</text>
      </view>
      <text class="sub-btn" @click="subscribeGuide">去开启</text>
      <text class="sub-close" @click="showSubscribeGuide = false">×</text>
    </view>

    <!-- ===== Tab 1：待办公告 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'pending'">
      <!-- 班级作业 -->
      <view class="sec">
        <view class="st">📝 待完成作业 <text v-if="homework.length" class="sc-badge">{{ homework.length }}项</text></view>
        <view v-if="!homework.length" class="empty-card">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">暂无待完成作业</text>
        </view>
        <view class="nitem" v-for="h in visibleHomework" :key="h.id">
          <view class="nt">{{ h.subject }} · {{ h.title }}
            <text class="ndate">{{ h.deadline || h.startDate }}</text>
            <text class="hwstatus">{{ h.status }}</text>
          </view>
          <view class="nc">{{ h.content }}</view>
        </view>
        <view v-if="homework.length > 5" class="att-empty" @click="showAllHomework = !showAllHomework">{{ showAllHomework ? '收起' : ('查看全部 ' + homework.length + ' 条作业') }}</view>
      </view>

      <!-- 班级通知 -->
      <view class="sec">
        <view class="st">📢 班级公告 <text v-if="notices.length" class="sc-badge">{{ notices.length }}条</text></view>
        <view v-if="!notices.length" class="empty-card">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无班级公告</text>
        </view>
        <view class="nitem" v-for="n in visibleNotices" :key="n.id">
          <view class="nt">{{ n.title }}<text v-if="n.pinned" class="npin">置顶</text></view>
          <view class="nc">{{ n.content }}</view>
        </view>
        <view v-if="notices.length > 5" class="att-empty" @click="showAllNotices = !showAllNotices">{{ showAllNotices ? '收起' : ('查看全部 ' + notices.length + ' 条公告') }}</view>
      </view>
    </scroll-view>

    <!-- ===== Tab 2：成绩查询 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'scores'">
      <view class="sec">
        <view class="st">📊 考试成绩</view>
        <view v-if="!exams.length" class="empty-card">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无考试成绩</text>
        </view>

        <template v-if="exams.length">
          <view class="exam-selector">
            <picker :value="selectedExamIndex" :range="examOptions" @change="onExamChange">
              <view class="picker">{{ examOptions[selectedExamIndex] || '— 请选择考试 —' }}</view>
            </picker>
          </view>

          <view v-if="selectedExam" class="exam-detail">
            <view class="exam-header">
              <text class="exam-name">{{ selectedExam.examName }}</text>
              <text class="exam-date">{{ selectedExam.date }}</text>
            </view>

            <view class="exam-total">
              总分
              <text class="tv">{{ selectedExam.totalScore ?? '--' }}</text>
              /
              <text class="tv">{{ selectedExam.totalFullScore ?? '--' }}</text>
              分
              <text v-if="selectedExam.classRank != null" class="tr">
                （班级第 {{ selectedExam.classRank }} 名
                <text v-if="selectedExam.gradeRank != null"> / 年级第 {{ selectedExam.gradeRank }} 名</text>）
              </text>
            </view>

            <view class="subject-list">
              <view v-for="s in orderedSubjects" :key="s.subject" class="srow">
                <text class="ssubject">{{ s.subject }}</text>
                <text class="sscore">{{ s.score != null ? s.score + ' / ' + s.fullScore : '暂未录入' }}</text>
                <text class="srank">班级第{{ s.classRank ?? '--' }}名</text>
              </view>
            </view>

            <view v-if="strengths.length || weaknesses.length" class="sw-section">
              <view v-if="strengths.length" class="sw-row">
                <text class="sw-label sw-strong">优势学科</text>
                <text class="sw-list">{{ strengths.join('、') }}</text>
              </view>
              <view v-if="weaknesses.length" class="sw-row">
                <text class="sw-label sw-weak">薄弱学科</text>
                <text class="sw-list">{{ weaknesses.join('、') }}</text>
              </view>
            </view>

            <view v-if="histogram.length" class="chart-section">
              <view class="chart-title">总分分布（{{ histogram.length > 1 ? histogram[0].label + ' ~ ' + histogram[histogram.length - 1].label : '' }}）</view>
              <scroll-view scroll-x class="chart-scroll">
                <view class="chart">
                  <view v-for="seg in histogram" :key="seg.label" class="bar-col">
                    <view class="bar" :style="{ height: seg.pct + '%' }" :class="seg.isStudent && 'highlight'"></view>
                    <text class="bar-label">{{ seg.label }}</text>
                    <text class="bar-count">{{ seg.count }}人</text>
                  </view>
                </view>
              </scroll-view>
            </view>
            <view class="exam-analysis">
              <text class="ea-label">📝 本次考试分析：</text>
              <text class="ea-text">{{ selectedExam.analysisNote || '继续加油努力！' }}</text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <!-- ===== Tab 3：考勤看板 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'attendance'">
      <view class="sec">
        <view class="st">📈 考勤看板</view>
        <view v-if="!attendance" class="empty-card">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无考勤数据</text>
        </view>
        <template v-else>
          <!-- 四类打卡汇总 -->
          <view class="att-chips">
            <view v-for="c in attendanceChips" :key="c.type" class="att-chip" :class="c.cls">
              <text class="att-ico">{{ c.icon }}</text>
              <text class="att-num">{{ c.count }}</text>
              <text class="att-lbl">{{ c.label }}</text>
            </view>
          </view>
          <!-- 近 6 个月趋势 -->
          <view v-if="attendanceByMonth.length" class="att-trend">
            <text class="att-trend-title">近 6 个月打卡趋势</text>
            <view v-for="m in attendanceByMonth" :key="m.month" class="att-trend-row">
              <text class="att-trend-month">{{ m.month }}</text>
              <view class="att-trend-bar-bg"><view class="att-trend-bar" :style="{ width: Math.max(4, m.pct) + '%' }"></view></view>
              <text class="att-trend-count">{{ m.count }}次</text>
            </view>
          </view>
          <!-- 最近打卡 -->
          <view v-if="attendanceRecent.length" class="att-recent">
            <text class="att-recent-title">最近打卡</text>
            <view v-for="r in attendanceRecent.slice(0, 8)" :key="r.id" class="att-rec">
              <text class="att-rec-ico" :class="(attMeta[r.type] || {}).cls || 'att-default'">{{ (attMeta[r.type] || {}).icon || '📌' }}</text>
              <view class="att-rec-main">
                <text class="att-rec-lbl">{{ (attMeta[r.type] || {}).label || r.type }} · {{ r.count }} 次</text>
                <text v-if="r.note" class="att-rec-note">{{ r.note }}</text>
              </view>
              <text class="att-rec-date">{{ r.date }}</text>
            </view>
          </view>
          <view v-else class="att-empty">暂无打卡记录</view>
        </template>
      </view>

      <!-- ===== 行为表现 ===== -->
      <view class="sec">
        <view class="st">⚖️ 行为表现</view>
        <view v-if="!behavior" class="empty-card">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无行为数据</text>
        </view>
        <template v-else>
          <view class="att-chips">
            <view v-for="c in behaviorChips" :key="c.label" class="beh-chip" :class="c.cls">
              <text class="att-num">{{ c.count }}</text>
              <text class="att-lbl">{{ c.label }}</text>
            </view>
          </view>
          <view v-if="behaviorByMonth.length" class="att-trend">
            <text class="att-trend-title">近 6 月趋势</text>
            <view v-for="m in behaviorByMonth" :key="m.month" class="att-trend-row">
              <text class="att-trend-month">{{ m.month }}</text>
              <view class="att-trend-bar-bg"><view class="att-trend-bar" :class="m.max ? 'bmax' : 'bmuted'" :style="{ width: Math.max(4, m.pct) + '%' }"></view></view>
              <text class="att-trend-count">{{ m.count }}</text>
            </view>
          </view>
          <view class="att-recent">
            <text class="att-recent-title">最近记录</text>
            <view v-if="!behaviorRecent.length" class="att-empty" style="margin-top:0">暂无行为记录</view>
            <view v-for="r in behaviorRecent" :key="r.id" class="beh-rec">
              <view class="beh-dot" :class="'beh-' + r.category"></view>
              <view class="att-rec-main">
                <text class="att-rec-lbl">{{ r.behavior }}</text>
                <text v-if="r.note" class="att-rec-note">{{ r.note }}</text>
              </view>
              <text class="att-rec-date">{{ r.date }}</text>
            </view>
          </view>
        </template>
      </view>

      <!-- ===== 课表 & 值日 ===== -->
      <view class="sec">
        <view class="st">🗓️ 课表 & 值日</view>
        <view v-if="!schedule" class="empty-card">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无课表数据</text>
        </view>
        <template v-else>
          <view class="sch-strip">
            <view v-for="d in weekDays" :key="d.dow" class="sch-day" :class="{ on: d.dow === todayDow }">
              <text class="sch-dow">{{ d.label }}</text>
            </view>
          </view>
          <view class="att-trend">
            <text class="att-trend-title">今日课表</text>
            <view v-if="!todaySchedule.length" class="att-empty" style="margin-top:0">今天没有排课</view>
            <view v-for="(it, i) in todaySchedule" :key="i" class="sch-item">
              <text class="sch-period">{{ it.section || ('第' + (i + 1) + '节') }}</text>
              <text class="sch-subject">{{ it.subject }}</text>
              <text v-if="it.teacher" class="sch-teacher">{{ it.teacher }}</text>
            </view>
          </view>
          <view class="att-recent">
            <text class="att-recent-title">本周值日</text>
            <view v-if="!(schedule.upcomingDuty && schedule.upcomingDuty.length)" class="att-empty" style="margin-top:0">近期没有值日安排</view>
            <view v-for="(d, i) in (schedule.upcomingDuty || [])" :key="i" class="sch-duty">
              <text class="sch-duty-ico">🧹</text>
              <text class="sch-duty-text">{{ d.date }} · {{ d.name }} · {{ d.type === 'weekly' ? '每周' : '日常' }}</text>
            </view>
          </view>
        </template>
      </view>

      <!-- ===== 家校沟通 ===== -->
      <view class="sec">
        <view class="st">💬 家校沟通</view>
        <view v-if="!communications" class="empty-card">
          <text class="empty-icon">📊</text>
          <text class="empty-text">暂无沟通数据</text>
        </view>
        <template v-else>
          <view class="comm-chip">
            <text class="comm-chip-text">沟通 {{ communications.total || 0 }} 次</text>
          </view>
          <view class="att-recent">
            <text class="att-recent-title">最近沟通</text>
            <view v-if="!(communications.recent && communications.recent.length)" class="att-empty" style="margin-top:0">暂无沟通记录</view>
            <view v-for="r in (communications.recent || [])" :key="r.id" class="comm-rec">
              <view class="comm-rec-head">
                <text class="comm-date">{{ r.date }}</text>
                <text v-if="r.method" class="comm-badge">{{ r.method }}</text>
              </view>
              <text class="comm-content">{{ r.content }}</text>
              <text v-if="r.followUp" class="comm-follow">跟进：{{ r.followUp }}</text>
              <text v-if="r.parentName || r.relation" class="comm-meta">{{ r.parentName }}{{ r.relation ? ' · ' + r.relation : '' }}</text>
            </view>
          </view>
          <view class="comm-btn" @click="contactTeacher">💬 联系老师</view>
        </template>
      </view>
    </scroll-view>

    <!-- ===== Tab 4：健康度总览 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'overview'">
      <!-- 学生信息（查看 / 申请修改） -->
      <view class="sec">
        <view class="st">📝 学生信息</view>
        <view v-if="studentInfo" class="info-card">
          <view class="info-row"><text class="info-label">家长姓名</text><text class="info-val">{{ studentInfo.parentName || '--' }}</text></view>
          <view class="info-row"><text class="info-label">家长电话</text><text class="info-val">{{ studentInfo.parentPhone || '--' }}</text></view>
          <view class="info-row"><text class="info-label">学生电话</text><text class="info-val">{{ studentInfo.studentPhone || '--' }}</text></view>
          <view class="info-row"><text class="info-label">出生日期</text><text class="info-val">{{ studentInfo.birthDate || '--' }}</text></view>
          <view class="info-row"><text class="info-label">地址</text><text class="info-val">{{ studentInfo.address || '--' }}</text></view>
          <view class="info-row" v-if="studentInfo.note"><text class="info-label">备注</text><text class="info-val">{{ studentInfo.note }}</text></view>
          <view class="info-actions">
            <view class="info-btn primary" @click="openEditStudentInfo">修改信息</view>
            <view class="info-btn" @click="openStudentRequests">查看申请记录</view>
          </view>
        </view>
        <view v-else class="empty-card">
          <text class="empty-icon">📄</text>
          <text class="empty-text">暂无学生信息</text>
        </view>
      </view>

      <view class="sec">
        <view class="st">💡 孩子在校健康度总览</view>
        <view class="health-grid">
          <view v-for="h in healthOverview" :key="h.key" class="health-item">
            <view class="health-light" :class="'hl-' + h.status"></view>
            <text class="health-ico">{{ h.icon }}</text>
            <text class="health-lbl">{{ h.label }}</text>
            <text class="health-hint">{{ h.hint }}</text>
          </view>
        </view>
        <view class="remind-head">🔔 今日需关注</view>
        <view v-if="!reminders.length" class="empty-card">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">暂无需要关注的事项</text>
        </view>
        <view v-for="(r, i) in reminders" :key="i" class="remind-item" :class="'rm-' + r.level">
          <text class="remind-ico">{{ r.icon }}</text>
          <text class="remind-text">{{ r.text }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 视角切换：切换到教师端（仅当有 teacherToken 时显示） -->
    <view class="switch-role" v-if="parent.teacherToken" @tap="switchToTeacher">
      🔄 切换到教师端
    </view>

    <!-- 修改密码弹窗 -->
    <view v-if="showPwdModal" class="pwd-mask" @click="showPwdModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">修改登录密码</text>
          <text class="pwd-close" @click="showPwdModal = false">✕</text>
        </view>
        <view v-if="pwdOk" class="pwd-ok">✅ 密码修改成功</view>
        <view v-if="pwdError" class="pwd-err">{{ pwdError }}</view>
        <text class="pwd-label">原密码</text>
        <input class="pwd-input" :password="true" placeholder="请输入当前密码" v-model="oldPwd" />
        <text class="pwd-label">新密码（至少 8 位）</text>
        <input class="pwd-input" :password="true" placeholder="请输入新密码" v-model="newPwd" />
        <button class="pwd-btn" :disabled="pwdLoading" @click="submitChangePwd">{{ pwdLoading ? '提交中…' : '确认修改' }}</button>
      </view>
    </view>

    <!-- 修改学生信息弹窗 -->
    <view v-if="showStudentInfoModal" class="pwd-mask" @click="showStudentInfoModal = false">
      <view class="pwd-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">修改学生信息</text>
          <text class="pwd-close" @click="showStudentInfoModal = false">✕</text>
        </view>
        <text class="pwd-tip">提交后需老师审核通过才会更新</text>
        <view v-if="editOk" class="pwd-ok">✅ 已提交，等待老师审核</view>
        <view v-if="editError" class="pwd-err">{{ editError }}</view>
        <text class="pwd-label">家长姓名</text>
        <input class="pwd-input" placeholder="请输入家长姓名" v-model="editForm.parentName" />
        <text class="pwd-label">家长电话</text>
        <input class="pwd-input" placeholder="请输入家长电话" v-model="editForm.parentPhone" />
        <text class="pwd-label">学生电话</text>
        <input class="pwd-input" placeholder="请输入学生电话" v-model="editForm.studentPhone" />
        <text class="pwd-label">出生日期</text>
        <picker mode="date" :value="editForm.birthDate" @change="onBirthDateChange">
          <view class="pwd-input">{{ editForm.birthDate || '请选择出生日期' }}</view>
        </picker>
        <text class="pwd-label">地址</text>
        <input class="pwd-input" placeholder="请输入家庭住址" v-model="editForm.address" />
        <text class="pwd-label">备注</text>
        <textarea class="pwd-textarea" placeholder="如有其他说明请填写" v-model="editForm.note" />
        <button class="pwd-btn" :disabled="editSubmitting" @click="submitStudentInfo">{{ editSubmitting ? '提交中…' : '提交申请' }}</button>
      </view>
    </view>

    <!-- 申请记录弹窗 -->
    <view v-if="showStudentRequestsModal" class="pwd-mask" @click="showStudentRequestsModal = false">
      <view class="pwd-box req-box" @click.stop>
        <view class="pwd-head">
          <text class="pwd-title">申请记录</text>
          <text class="pwd-close" @click="showStudentRequestsModal = false">✕</text>
        </view>
        <view v-if="studentRequestsLoading" class="req-empty">加载中…</view>
        <view v-else-if="!studentRequests.length" class="req-empty">暂无申请记录</view>
        <scroll-view scroll-y v-else class="req-list">
          <view v-for="r in studentRequests" :key="r.id" class="req-item">
            <view class="req-head">
              <text class="req-name">{{ r.studentName || '学生' }}</text>
              <text class="req-status" :class="'rs-' + r.status">{{ reqStatusLabel(r.status) }}</text>
            </view>
            <text class="req-date">提交于 {{ r.createdAt }}</text>
            <view v-if="r.payload" class="req-payload">
              <text v-if="r.payload.parentName" class="req-line">家长姓名：{{ r.payload.parentName }}</text>
              <text v-if="r.payload.parentPhone" class="req-line">家长电话：{{ r.payload.parentPhone }}</text>
              <text v-if="r.payload.studentPhone" class="req-line">学生电话：{{ r.payload.studentPhone }}</text>
              <text v-if="r.payload.birthDate" class="req-line">出生日期：{{ r.payload.birthDate }}</text>
              <text v-if="r.payload.address" class="req-line">地址：{{ r.payload.address }}</text>
              <text v-if="r.payload.note" class="req-line">备注：{{ r.payload.note }}</text>
            </view>
            <text v-if="r.reviewNote" class="req-review">审核备注：{{ r.reviewNote }}</text>
            <text v-if="r.reviewedAt" class="req-reviewed">审核于 {{ r.reviewedAt }}</text>
          </view>
        </scroll-view>
        <button class="pwd-btn" @click="showStudentRequestsModal = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme, parent, logoutParent, switchRole } from '../../common/store'
import { parentApi } from '../../common/request'

const dark = computed(() => theme.mode === 'dark')
const tab = ref('pending')  // pending = 待办公告, scores = 成绩查询
const showSubscribeGuide = ref(true)

// 微信订阅消息引导
async function subscribeGuide() {
  try {
    const { accept } = await wx.requestSubscribeMessage({
      tmplIds: ['NOTICE_TEMPLATE_ID', 'HOMEWORK_TEMPLATE_ID'],
    })
    const count = Object.values(accept || {}).filter(v => v === 'accept').length
    if (count > 0) {
      uni.showToast({ title: `已订阅 ${count} 项通知`, icon: 'success' })
      showSubscribeGuide.value = false
    }
  } catch (e) {
    // 用户取消授权
  }
}

const me = ref(null)
const kids = ref([])
const activeKidId = ref('')
const notices = ref([])
const exams = ref([])
const homework = ref([])
const attendance = ref(null)
const behavior = ref(null)
const schedule = ref(null)
const communications = ref(null)
const loading = ref(true)
const loadError = ref(false)
const selectedExamIndex = ref(0)

const examOptions = computed(() => exams.value.map((e, i) => e.examName || ('考试' + (i + 1))))
const selectedExam = computed(() => exams.value[selectedExamIndex.value] || null)

const SUBJECT_ORDER = ['语文', '数学', '英语', '科学', '品德']
const orderedSubjects = computed(() => {
  const subs = (selectedExam.value?.subjects || []).slice()
  subs.sort((a, b) => {
    const ai = SUBJECT_ORDER.indexOf(a.subject)
    const bi = SUBJECT_ORDER.indexOf(b.subject)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return (a.subject || '').localeCompare(b.subject || '')
  })
  return subs
})

const EXCELLENT_RATIO = 0.8
const rankedSubjects = computed(() => {
  const subs = selectedExam.value?.subjects || []
  return subs
    .filter(s => s.score != null && s.fullScore)
    .map(s => ({ subject: s.subject, score: s.score, fullScore: s.fullScore, pct: s.score / s.fullScore, raw: s }))
    .sort((a, b) => b.pct - a.pct)
})

const strengths = computed(() => {
  const arr = rankedSubjects.value
  if (!arr.length) return []
  return arr.filter(s => s.pct >= EXCELLENT_RATIO).map(s => s.subject)
})

const weaknesses = computed(() => {
  const arr = rankedSubjects.value
  if (!arr.length) return []
  const below = arr.filter(s => s.pct < EXCELLENT_RATIO).sort((a, b) => a.pct - b.pct)
  return below.slice(0, 3).map(s => s.subject)
})

const histogram = computed(() => {
  const exam = selectedExam.value
  if (!exam?.distribution?.length) return []
  const maxCount = Math.max(...exam.distribution.map(d => d.count), 1)
  const studentTotal = exam.totalScore ?? 0
  return exam.distribution.map(d => {
    const label = d.label || d.scoreRange || ''
    const parts = label.split('-')
    const lo = parseInt(parts[0])
    const hi = parseInt(parts[1])
    const isStudent = !isNaN(lo) && !isNaN(hi) && lo <= studentTotal && studentTotal <= hi
    return { label, count: d.count, pct: (d.count / maxCount) * 100, isStudent }
  })
})

// 考勤看板：打卡类型元信息 + 汇总卡片（与 Web 端保持一致的类型/图标）
const ATT_META = {
  reading: { label: '阅读', icon: '📚', cls: 'att-reading' },
  sport: { label: '运动', icon: '🏃', cls: 'att-sport' },
  behavior: { label: '行为', icon: '⭐', cls: 'att-behavior' },
  homework: { label: '作业', icon: '📝', cls: 'att-homework' },
}
const attMeta = ATT_META
const attendanceChips = computed(() => {
  const s = attendance.value && attendance.value.summary
  return ['reading', 'sport', 'behavior', 'homework'].map(t => ({ ...ATT_META[t], type: t, count: s ? s[t] : 0 }))
})
const attendanceRecent = computed(() => (attendance.value && attendance.value.recent) || [])
const attendanceByMonth = computed(() => {
  const list = (attendance.value && attendance.value.byMonth) || []
  const max = Math.max(1, ...list.map(m => m.count))
  return list.map(m => ({ ...m, pct: Math.round((m.count / max) * 100) }))
})

// 行为表现 / 课表值日 / 家校沟通
const todayDow = computed(() => ((new Date().getDay() + 6) % 7) + 1)
const weekDays = [
  { dow: 1, label: '一' }, { dow: 2, label: '二' }, { dow: 3, label: '三' },
  { dow: 4, label: '四' }, { dow: 5, label: '五' }, { dow: 6, label: '六' }, { dow: 7, label: '日' },
]
const behaviorChips = computed(() => {
  const s = behavior.value && behavior.value.summary
  return [
    { label: '表扬', count: s ? s.praise : 0, cls: 'beh-green' },
    { label: '违纪', count: s ? s.violation : 0, cls: 'beh-red' },
    { label: '其他', count: s ? s.other : 0, cls: 'beh-amber' },
  ]
})
const behaviorRecent = computed(() => (behavior.value && behavior.value.recent) || [])
const behaviorByMonth = computed(() => {
  const list = (behavior.value && behavior.value.byMonth) || []
  const max = Math.max(0, ...list.map(m => m.count))
  return list.map(m => ({ ...m, pct: max ? Math.round((m.count / max) * 100) : 0, max: m.count === max && max > 0 }))
})
const todaySchedule = computed(() => {
  const w = ((schedule.value && schedule.value.week) || []).find(d => d.dayOfWeek === todayDow.value)
  return (w && w.items) || []
})
function contactTeacher() {
  uni.showToast({ title: '请在「消息」中联系老师', icon: 'none' })
}

// 孩子在校健康度总览（5 维状态灯）+ 提醒中心（聚合已有数据，各维逐步点亮）
const latestExam = computed(() => exams.value.length ? exams.value[exams.value.length - 1] : null)
const pendingHomework = computed(() => homework.value.filter(h => h.status !== '已完成').length)
const stats = computed(() => {
  const noticeCount = (notices.value || []).filter(n => n.pinned).length || notices.value.length || 0
  const homeworkCount = pendingHomework.value
  const examCount = exams.value.length || 0
  const rank = latestExam.value
    ? latestExam.value.classRank
      ? `第${latestExam.value.classRank}名`
      : latestExam.value.gradeRank
        ? `年级第${latestExam.value.gradeRank}名`
        : '--'
    : '--'
  return { notices: noticeCount, homework: homeworkCount, exams: examCount, rank }
})
const healthOverview = computed(() => {
  const att = attendance.value
  const attRecent = (att && att.recent) || []
  const attNegative = attRecent.some(r => /旷课|缺勤|违纪|迟到/.test(r.note || ''))
  const attCount = (att && att.total) || 0
  const subs = (latestExam.value && latestExam.value.subjects) || []
  const weak = subs.filter(s => s.score != null && s.fullScore && (s.score / s.fullScore) < 0.6).length
  const strong = subs.filter(s => s.score != null && s.fullScore && (s.score / s.fullScore) >= 0.8).length
  const overdue = homework.value.filter(h => h.status === '逾期' || h.status === '已逾期').length
  const pend = pendingHomework.value
  const beh = (att && att.summary && att.summary.behavior) || 0
  const urgent = notices.value.filter(n => n.pinned).length
  return [
    { key: 'attendance', label: '考勤', icon: '🕒', status: attNegative ? 'red' : attCount > 0 ? 'green' : 'yellow', hint: attNegative ? '有缺勤/违纪' : attCount > 0 ? '打卡正常' : '暂无打卡' },
    { key: 'exam', label: '成绩', icon: '📈', status: weak >= 2 ? 'red' : weak === 1 ? 'yellow' : strong > 0 ? 'green' : 'yellow', hint: weak >= 2 ? '多科偏弱' : strong > 0 ? '发挥稳定' : '关注薄弱' },
    { key: 'homework', label: '作业', icon: '✅', status: overdue > 0 ? 'red' : pend > 0 ? 'yellow' : 'green', hint: overdue > 0 ? overdue + ' 项逾期' : pend > 0 ? pend + ' 项待完成' : '全部完成' },
    { key: 'behavior', label: '行为', icon: '⚖️', status: beh > 0 ? 'green' : 'yellow', hint: beh > 0 ? '表现良好' : '暂无记录' },
    { key: 'comm', label: '沟通', icon: '💬', status: urgent > 0 ? 'red' : notices.value.length > 0 ? 'green' : 'yellow', hint: urgent > 0 ? urgent + ' 条置顶' : notices.value.length > 0 ? '消息已读' : '暂无消息' },
  ]
})
const reminders = computed(() => {
  const list = []
  homework.value.filter(h => h.status === '逾期' || h.status === '已逾期').forEach(h => list.push({ icon: '⏰', text: '作业逾期：' + h.subject + '·' + h.title, level: 'red' }))
  ;((attendance.value && attendance.value.recent) || []).filter(r => /旷课|缺勤|违纪|迟到/.test(r.note || '')).forEach(r => list.push({ icon: '⚠️', text: '考勤预警：' + r.note, level: 'red' }))
  notices.value.filter(n => n.pinned).forEach(n => list.push({ icon: '📢', text: '置顶通知：' + n.title, level: 'yellow' }))
  const pend = homework.value.filter(h => h.status !== '已完成' && h.status !== '逾期' && h.status !== '已逾期')
  if (pend.length) list.push({ icon: '📝', text: pend.length + ' 项作业待完成', level: 'yellow' })
  return list
})

// 公告/作业「查看全部」展开（与 Web 端一致的交互）
const showAllNotices = ref(false)
const showAllHomework = ref(false)
const visibleNotices = computed(() => showAllNotices.value ? notices.value : notices.value.slice(0, 5))
const visibleHomework = computed(() => showAllHomework.value ? homework.value : homework.value.slice(0, 5))

// 修改密码（后端 change-password 已存在，补小程序端入口）
const showPwdModal = ref(false)
const oldPwd = ref('')
const newPwd = ref('')
const pwdLoading = ref(false)
const pwdError = ref('')
const pwdOk = ref(false)
async function submitChangePwd() {
  pwdError.value = ''
  pwdOk.value = false
  if (!oldPwd.value || !newPwd.value) { pwdError.value = '请填写原密码与新密码'; return }
  if (newPwd.value.length < 8) { pwdError.value = '新密码至少 8 位'; return }
  pwdLoading.value = true
  try {
    await parentApi.post('/parent-auth/change-password', { oldPassword: oldPwd.value, newPassword: newPwd.value })
    pwdOk.value = true
    oldPwd.value = ''
    newPwd.value = ''
    setTimeout(() => { showPwdModal.value = false; pwdOk.value = false }, 1200)
  } catch (e) {
    pwdError.value = (e && e.message) || '修改失败，请重试'
  } finally {
    pwdLoading.value = false
  }
}

function onExamChange(e) { selectedExamIndex.value = e.detail.value }

// 学生信息查看 / 申请修改
const studentInfo = computed(() => me.value && me.value.studentInfo)
const showStudentInfoModal = ref(false)
const showStudentRequestsModal = ref(false)
const studentRequests = ref([])
const studentRequestsLoading = ref(false)
const editForm = ref({ parentPhone: '', studentPhone: '', address: '', birthDate: '', parentName: '', note: '' })
const editSubmitting = ref(false)
const editError = ref('')
const editOk = ref(false)

function openEditStudentInfo() {
  const si = (me.value && me.value.studentInfo) || {}
  editForm.value = {
    parentPhone: si.parentPhone || '',
    studentPhone: si.studentPhone || '',
    address: si.address || '',
    birthDate: si.birthDate || '',
    parentName: si.parentName || (me.value && me.value.parentName) || '',
    note: si.note || '',
  }
  editError.value = ''
  editOk.value = false
  showStudentInfoModal.value = true
}

function onBirthDateChange(e) { editForm.value.birthDate = e.detail.value }

async function submitStudentInfo() {
  editError.value = ''
  editOk.value = false
  editSubmitting.value = true
  try {
    await parentApi.post('/parent-auth/student-update-request', { payload: { ...editForm.value } })
    editOk.value = true
    setTimeout(() => { showStudentInfoModal.value = false; editOk.value = false }, 1200)
  } catch (e) {
    editError.value = (e && e.message) || '提交失败，请重试'
  } finally {
    editSubmitting.value = false
  }
}

function reqStatusLabel(s) {
  return s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核'
}

async function openStudentRequests() {
  showStudentRequestsModal.value = true
  studentRequestsLoading.value = true
  try {
    const list = await parentApi.get('/parent-auth/student-update-requests')
    studentRequests.value = Array.isArray(list) ? list : []
  } catch (e) {
    studentRequests.value = []
  } finally {
    studentRequestsLoading.value = false
  }
}

function bindPhone() {
  uni.showLoading({ title: '绑定微信…', mask: true })
  uni.getUserProfile({
    desc: '用于家校联系',
    success: async (res) => {
      const nickName = res.userInfo?.nickName || ''
      try {
        const { code } = await uni.login()
        await parentApi.post('/parent-auth/bind-wechat', { code, nickName })
        uni.hideLoading()
        uni.showToast({ title: '微信绑定成功' + (nickName ? '：' + nickName : ''), icon: 'success' })
        const meData = await parentApi.get('/parent-auth/me')
        me.value = meData
        kids.value = (meData && meData.kids) || []
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '绑定失败', icon: 'none' })
      }
    },
    fail: () => { uni.hideLoading() },
  })
}

async function switchToKid(studentId) {
  if (studentId === activeKidId.value) return
  uni.showLoading({ title: '切换中…' })
  try {
    const res = await parentApi.post('/parent-auth/switch-student', { studentId })
    const data = res.data || res
    if (data.token) {
      parent.token = data.token
      // 重新加载数据
      me.value = null
      load()
    }
  } catch (e) {
    uni.showToast({ title: '切换失败', icon: 'error' })
  } finally {
    uni.hideLoading()
  }
}

function goCompare() {
  uni.navigateTo({ url: '/pages/parent/compare' })
}

function switchToTeacher() {
  uni.showModal({
    title: '切换身份',
    content: '确定切换到教师端？',
    success: (res) => {
      if (res.confirm) {
        switchRole('teacher')
      }
    },
  })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    confirmColor: '#e64340',
    success: (res) => {
      if (res.confirm) {
        logoutParent()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },
  })
}

async function load() {
  loading.value = true
  loadError.value = false
  // 并行发起所有请求，避免串行多轮网络往返（冷启动耗时近 N×RTT → 1×RTT）
  const [meResult, edata, ns, hw, att, beh, sch, comm] = await Promise.allSettled([
    parentApi.get('/parent-auth/me'),
    parentApi.get('/parent-auth/exams'),
    parentApi.get('/parent-auth/notices'),
    parentApi.get('/parent-auth/homework'),
    parentApi.get('/parent-auth/attendance'),
    parentApi.get('/parent-auth/behavior'),
    parentApi.get('/parent-auth/schedule'),
    parentApi.get('/parent-auth/communications'),
  ])
  if (meResult.status === 'fulfilled') {
    me.value = meResult.value
    kids.value = (meResult.value && meResult.value.kids) || []
    activeKidId.value = meResult.value?.studentId || ''
  } else console.error('[parent] me error:', meResult.reason)
  if (edata.status === 'fulfilled') exams.value = (edata.value && edata.value.exams) || []
  else console.error('[parent] exams error:', edata.reason)
  if (ns.status === 'fulfilled') notices.value = Array.isArray(ns.value) ? ns.value : []
  if (hw.status === 'fulfilled') homework.value = Array.isArray(hw.value) ? hw.value : []
  if (att.status === 'fulfilled') attendance.value = att.value || null
  else console.error('[parent] attendance error:', att.reason)
  if (beh.status === 'fulfilled') behavior.value = beh.value || null
  else console.error('[parent] behavior error:', beh.reason)
  if (sch.status === 'fulfilled') schedule.value = sch.value || null
  else console.error('[parent] schedule error:', sch.reason)
  if (comm.status === 'fulfilled') communications.value = comm.value || null
  else console.error('[parent] communications error:', comm.reason)
  // 身份/核心数据拉取失败 → 标记为可重试错误态
  loadError.value = meResult.status !== 'fulfilled'
  loading.value = false
}

onShow(() => {
  if (!parent.token) { uni.reLaunch({ url: '/pages/parent-login/parent-login' }); return }
  load()
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.hd-actions { display: flex; gap: 16rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.out { font-size: 24rpx; color: #9aa0a6; }
.kids { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.kid { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; }
.kn { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.sno { font-size: 22rpx; font-weight: 400; color: var(--c-sub); }
.wechat-badge { font-size: 20rpx; color: #07c160; background: #e8f5e9; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; }
.kc { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
/* Tabs */
.tabs { display: flex; gap: 10rpx; margin-bottom: 14rpx; }
.tab { flex: 1; text-align: center; font-size: 28rpx; padding: 16rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; }
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
/* Stats Row */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin-bottom: 14rpx; }
.stat-card { background: var(--c-card); border-radius: 12rpx; padding: 14rpx 10rpx; text-align: center; }
.stat-card.clickable { transition: transform 0.15s, box-shadow 0.15s; }
.stat-card.clickable:active { transform: scale(0.96); box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.1); }
.stat-label { font-size: 22rpx; color: var(--c-sub); margin-bottom: 6rpx; }
.stat-value { font-size: 28rpx; font-weight: 800; color: var(--c-title); }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.sc-badge { font-size: 20rpx; color: #fff; background: var(--c-primary); padding: 2rpx 12rpx; border-radius: 20rpx; font-weight: 400; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.ndate { font-size: 20rpx; color: var(--c-sub); margin-left: 12rpx; font-weight: 400; }
.hwstatus { font-size: 20rpx; color: #e6a23c; margin-left: 12rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
/* Exam Selector */
.exam-selector { margin-bottom: 14rpx; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: var(--c-title); font-weight: 600; text-align: center; }
.exam-detail { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; margin-bottom: 14rpx; }
.exam-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.exam-name { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.exam-date { font-size: 22rpx; color: var(--c-sub); }
.exam-total { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; line-height: 1.6; }
.tv { color: #07c160; font-weight: 700; font-size: 28rpx; }
.tr { margin-left: 4rpx; }
.sw-section { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 16rpx; margin-bottom: 14rpx; }
.sw-row { display: flex; align-items: baseline; gap: 10rpx; line-height: 1.8; }
.sw-label { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; }
.sw-strong { background: #e8f9e8; color: #07c160; }
.sw-weak { background: #fde8e8; color: #e06c75; }
.sw-list { font-size: 24rpx; color: var(--c-title); }
.subject-list { margin-bottom: 14rpx; }
.srow { display: flex; align-items: center; padding: 8rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.srow:last-child { border-bottom: none; }
.ssubject { width: 100rpx; font-size: 24rpx; color: var(--c-title); font-weight: 600; flex-shrink: 0; }
.sscore { flex: 1; font-size: 24rpx; color: var(--c-sub); text-align: center; }
.srank { width: 130rpx; font-size: 22rpx; color: #9aa0a6; text-align: right; flex-shrink: 0; }
.chart-section { margin-top: 6rpx; }
.chart-title { font-size: 22rpx; color: var(--c-sub); margin-bottom: 10rpx; }
.chart-scroll { overflow-x: auto; white-space: nowrap; }
.chart { display: flex; align-items: flex-end; gap: 6rpx; padding: 0 10rpx 0 0; min-height: 240rpx; }
.bar-col { display: flex; flex-direction: column; align-items: center; width: 52rpx; flex-shrink: 0; }
.bar { width: 36rpx; min-height: 4rpx; border-radius: 6rpx 6rpx 0 0; background: #c8e6c9; transition: height 0.3s; }
.bar.highlight { background: #07c160; }
.bar-label { font-size: 18rpx; color: #9aa0a6; margin-top: 6rpx; }
.bar-count { font-size: 18rpx; color: var(--c-sub); margin-top: 2rpx; }
.exam-analysis { margin-top: 14rpx; padding: 14rpx; background: var(--c-input); border-radius: 10rpx; }
/* 订阅引导卡 */
.subscribe-card { display: flex; align-items: center; gap: 12rpx; background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; position: relative; }
.sub-icon { font-size: 36rpx; flex-shrink: 0; }
.sub-text { flex: 1; min-width: 0; }
.sub-title { font-size: 26rpx; font-weight: 700; color: #2e7d32; display: block; }
.sub-desc { font-size: 22rpx; color: #558b2f; margin-top: 2rpx; }
.sub-btn { flex-shrink: 0; font-size: 24rpx; color: #fff; background: #43a047; padding: 8rpx 20rpx; border-radius: 30rpx; font-weight: 600; }
.sub-close { position: absolute; top: 6rpx; right: 12rpx; font-size: 28rpx; color: #9e9e9e; line-height: 1; }
.ea-label { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 6rpx; }
.ea-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; }
/* 考勤看板 */
.att-chips { display: flex; gap: 12rpx; margin-bottom: 14rpx; }
.att-chip { flex: 1; border-radius: 14rpx; padding: 18rpx 0; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.att-ico { font-size: 36rpx; line-height: 1; }
.att-num { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.att-lbl { font-size: 22rpx; color: var(--c-sub); }
.att-reading { background: #e3f2fd; }
.att-sport { background: #e8f5e9; }
.att-behavior { background: #fef3e0; }
.att-homework { background: #fde8ef; }
.att-trend { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; }
.att-trend-title, .att-recent-title { font-size: 26rpx; font-weight: 700; color: var(--c-title); display: block; margin-bottom: 10rpx; }
.att-trend-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.att-trend-month { font-size: 20rpx; color: var(--c-sub); width: 110rpx; flex-shrink: 0; }
.att-trend-bar-bg { flex: 1; height: 18rpx; background: var(--c-input); border-radius: 10rpx; overflow: hidden; }
.att-trend-bar { height: 100%; border-radius: 10rpx; background: #07c160; }
.att-trend-count { font-size: 20rpx; color: var(--c-sub); width: 80rpx; text-align: right; flex-shrink: 0; }
.att-recent { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; }
.att-rec { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.att-rec:last-child { border-bottom: none; }
.att-rec-ico { width: 64rpx; height: 64rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; }
.att-rec-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.att-rec-lbl { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.att-rec-note { font-size: 22rpx; color: var(--c-sub); white-space: pre-wrap; }
.att-rec-date { font-size: 20rpx; color: var(--c-sub); flex-shrink: 0; }
.att-default { background: var(--c-input); }
.att-empty { background: var(--c-card); border-radius: 14rpx; padding: 28rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); margin-top: 12rpx; }
/* 修改密码弹窗 */
.pwd-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.pwd-box { width: 600rpx; background: var(--c-card); border-radius: 28rpx; padding: 40rpx; }
.pwd-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.pwd-title { font-size: 32rpx; font-weight: 800; color: var(--c-title); }
.pwd-close { font-size: 36rpx; color: var(--c-sub); }
.pwd-ok { font-size: 24rpx; color: #07c160; background: #e8f5e9; border-radius: 10rpx; padding: 14rpx; margin-bottom: 16rpx; }
.pwd-err { font-size: 24rpx; color: #e06c75; background: #fde8e8; border-radius: 10rpx; padding: 14rpx; margin-bottom: 16rpx; }
.pwd-label { font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; display: block; }
.pwd-input { background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--c-title); margin-bottom: 20rpx; }
.pwd-btn { background: #07c160; color: #fff; font-size: 28rpx; font-weight: 700; border-radius: 14rpx; padding: 22rpx; margin-top: 8rpx; }
.pwd-btn[disabled] { opacity: 0.6; }
/* 健康度总览 + 提醒中心 */
.health-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.health-item { width: calc(50% - 7rpx); background: var(--c-card); border-radius: 16rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 6rpx; position: relative; }
.health-light { position: absolute; top: 16rpx; right: 16rpx; width: 16rpx; height: 16rpx; border-radius: 50%; }
.hl-green { background: #07c160; }
.hl-yellow { background: #E6A23C; }
.hl-red { background: #f56c6c; }
.health-ico { font-size: 36rpx; line-height: 1; }
.health-lbl { font-size: 26rpx; font-weight: 700; color: var(--c-title); }
.health-hint { font-size: 20rpx; color: var(--c-sub); }
.remind-head { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin: 18rpx 0 10rpx; }
.remind-item { display: flex; align-items: center; gap: 12rpx; background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.remind-ico { font-size: 30rpx; }
.remind-text { font-size: 24rpx; color: var(--c-title); flex: 1; }
.rm-red { border-left: 6rpx solid #f56c6c; }
.rm-yellow { border-left: 6rpx solid #E6A23C; }
/* 行为表现 */
.beh-chip { flex: 1; border-radius: 14rpx; padding: 18rpx 0; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.beh-green { background: #e8f5e9; }
.beh-red { background: #fde8e8; }
.beh-amber { background: #fef3e0; }
.att-trend-bar.bmax { background: #07c160; }
.att-trend-bar.bmuted { background: #c8e6c9; }
.beh-rec { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.beh-rec:last-child { border-bottom: none; }
.beh-dot { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; }
.beh-praise { background: #07c160; }
.beh-violation { background: #f56c6c; }
.beh-other { background: #E6A23C; }
/* 课表 & 值日 */
.sch-strip { display: flex; gap: 8rpx; margin-bottom: 14rpx; }
.sch-day { flex: 1; text-align: center; padding: 10rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-size: 24rpx; }
.sch-day.on { background: var(--c-primary); color: #fff; font-weight: 700; }
.sch-item { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.sch-item:last-child { border-bottom: none; }
.sch-period { width: 130rpx; font-size: 24rpx; font-weight: 600; color: var(--c-title); flex-shrink: 0; }
.sch-subject { flex: 1; font-size: 26rpx; color: var(--c-title); }
.sch-teacher { font-size: 22rpx; color: var(--c-sub); flex-shrink: 0; }
.sch-duty { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.sch-duty:last-child { border-bottom: none; }
.sch-duty-ico { font-size: 28rpx; flex-shrink: 0; }
.sch-duty-text { font-size: 24rpx; color: var(--c-title); flex: 1; }
/* 家校沟通 */
.comm-chip { background: #e8f1fb; border-radius: 14rpx; padding: 18rpx 20rpx; margin-bottom: 14rpx; display: flex; }
.comm-chip-text { font-size: 26rpx; font-weight: 700; color: #1C6FB3; }
.comm-rec { padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.comm-rec:last-child { border-bottom: none; }
.comm-rec-head { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.comm-date { font-size: 20rpx; color: var(--c-sub); }
.comm-badge { font-size: 20rpx; color: #1C6FB3; background: #e8f1fb; padding: 2rpx 10rpx; border-radius: 8rpx; }
.comm-content { font-size: 26rpx; color: var(--c-title); line-height: 1.5; white-space: pre-wrap; display: block; }
.comm-follow { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.comm-meta { font-size: 20rpx; color: #9aa0a6; margin-top: 6rpx; display: block; }
.comm-btn { margin-top: 14rpx; background: #1C6FB3; color: #fff; font-size: 28rpx; font-weight: 600; text-align: center; padding: 20rpx; border-radius: 14rpx; }

/* 加载态 / 错误态（与 Web 端一致） */
.loading-mask { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20rpx; padding: 80rpx 0; }
.spinner { width: 56rpx; height: 56rpx; border: 6rpx solid var(--c-sub); border-top-color: #07c160; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 26rpx; color: var(--c-sub); }
.load-err { background: #E6A23C; color: #fff; font-size: 26rpx; text-align: center; padding: 20rpx; border-radius: 14rpx; margin-bottom: 12rpx; }
/* 孩子选择器 */
.kid-selector {
  padding: 8rpx 0 8rpx 16rpx;
  background: var(--c-card);
  border-bottom: 1rpx solid #f0f0f0;
  border-radius: 14rpx;
  margin-bottom: 10rpx;
}
.kid-chips {
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
  white-space: nowrap;
  align-items: center;
}
.kid-chip {
  padding: 6rpx 20rpx;
  border-radius: 100rpx;
  font-size: 26rpx;
  background: #f5f5f5;
  color: #666;
  flex-shrink: 0;
}
.kid-chip.active {
  background: #07c160;
  color: #fff;
}
.compare-btn {
  padding: 6rpx 20rpx;
  border-radius: 100rpx;
  font-size: 26rpx;
  background: #E6A23C;
  color: #fff;
  margin-left: auto;
  flex-shrink: 0;
}
.switch-role { text-align:center; padding:20rpx 0; font-size:26rpx; color:#07c160; border-top:1rpx solid #f0f0f0; margin-top:20rpx; }

/* 学生信息卡 */
.info-card { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; }
.info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.info-row:last-of-type { border-bottom: none; }
.info-label { font-size: 24rpx; color: var(--c-sub); flex-shrink: 0; }
.info-val { font-size: 24rpx; color: var(--c-title); font-weight: 600; text-align: right; flex: 1; margin-left: 16rpx; }
.info-actions { display: flex; gap: 14rpx; margin-top: 20rpx; }
.info-btn { flex: 1; text-align: center; font-size: 26rpx; padding: 18rpx 0; border-radius: 12rpx; background: var(--c-input); color: var(--c-title); font-weight: 600; }
.info-btn.primary { background: #07c160; color: #fff; }
.pwd-tip { font-size: 22rpx; color: #9aa0a6; margin-bottom: 16rpx; display: block; }
.pwd-textarea { background: var(--c-input); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: var(--c-title); margin-bottom: 20rpx; width: 100%; box-sizing: border-box; height: 120rpx; }
/* 申请记录弹窗 */
.req-box { max-height: 80vh; display: flex; flex-direction: column; }
.req-list { max-height: 600rpx; margin-bottom: 16rpx; }
.req-item { background: var(--c-input); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; }
.req-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.req-name { font-size: 26rpx; font-weight: 700; color: var(--c-title); }
.req-status { font-size: 20rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.rs-pending { background: #fef3e0; color: #E6A23C; }
.rs-approved { background: #e8f5e9; color: #07c160; }
.rs-rejected { background: #fde8e8; color: #e06c75; }
.req-date { font-size: 20rpx; color: var(--c-sub); display: block; margin-bottom: 8rpx; }
.req-payload { background: var(--c-card); border-radius: 10rpx; padding: 12rpx; margin-bottom: 8rpx; }
.req-line { font-size: 22rpx; color: var(--c-title); display: block; line-height: 1.6; }
.req-review { font-size: 22rpx; color: #e06c75; background: #fde8e8; border-radius: 8rpx; padding: 8rpx 12rpx; display: block; margin-top: 6rpx; }
.req-reviewed { font-size: 20rpx; color: #9aa0a6; display: block; margin-top: 6rpx; }
.req-empty { font-size: 24rpx; color: var(--c-sub); text-align: center; padding: 40rpx 0; }
</style>
