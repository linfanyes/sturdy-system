/**
 * 学生 / 家长默认口令计算（跨端共享）
 *
 * 【默认口令规则】与后端 User.defaultParentPassword 一致：学号后 6 位。
 * 仅用于前端 UI 提示/展示，不参与认证。
 *
 * 来源对齐：
 *   - web-app/src/views/teacher/Students.vue::toggleStudentParentLogin 由后端返回 initialPassword
 *   - mini-program/src/pages/students/students.vue::defaultPwd(s) = studentNo.slice(-6)
 *   - server/src/users/user.service.ts 内的初始口令计算
 */
/**
 * 根据学号生成家长端默认口令（学号后 6 位）。
 * - 学号不足 6 位：返回完整学号
 * - 空学号：返回空字符串
 */
export declare function defaultParentPassword(studentNo: string | undefined | null): string;
//# sourceMappingURL=student.d.ts.map