// 即时通讯（IM）端点（用户签名与家长好友列表）
export const imEndpoints = {
  '/im/user-sig': { sdkAppId: '', userSig: 'demo-user-sig' },
  '/im/parents': [
    { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', parentName: '张伟', relation: '爸爸', phone: '13800001001', wechat: '' },
    { imUserId: 'p_demo_li', studentId: 's2', studentName: '李小华', classId: 'c1', parentName: '李强', relation: '爸爸', phone: '13800001002', wechat: '' },
    { imUserId: 'p_demo_wang', studentId: 's3', studentName: '王小芳', classId: 'c1', parentName: '王磊', relation: '爸爸', phone: '13800001003', wechat: '' },
  ],
}
