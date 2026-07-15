<script setup lang="ts">import { ref, computed } from 'vue';
import { RefreshCw, Printer, Download } from 'lucide-vue-next';
import ToolPageHeader from '../../components/common/ToolPageHeader.vue';
const opSelected = ref<Record<string, boolean>>({
 '+': true,
 '-': true,
 '×': false,
 '÷': false,
});
const maxNum = ref(20);
const questions = ref<{
 q: string;
 a: number;
}[]>([]);
const showAnswer = ref(false);
const ops = ['+', '-', '×', '÷'];
function gen() {
 const list: typeof questions.value = [];
 const allowed = ops.filter((o) => opSelected.value[o]);
 if (!allowed.length)
 return;
 for (let i = 0; i < 200; i++) {
 let a = 0, b = 0, ans = 0, op = '';
 let tries = 0;
 do {
 op = allowed[Math.floor(Math.random() * allowed.length)];
 a = Math.floor(Math.random() * (maxNum.value + 1));
 b = Math.floor(Math.random() * (maxNum.value + 1));
 if (op === '+')
 ans = a + b;
 else if (op === '-') {
 if (a < b)
 [a, b] = [b, a];
 ans = a - b;
 }
 else if (op === '×')
 ans = a * b;
 else if (op === '÷') {
 b = b === 0 ? 1 : b;
 ans = a * b;
 a = ans;
 ans = a / b;
 }
 tries++;
 } while ((ans < 0 || ans > 999) && tries < 10);
 list.push({ q: `${a}${op}${b}`, a: ans });
 }
 questions.value = list;
 showAnswer.value = false;
}
function toggleOp(o: string) {
 opSelected.value[o] = !opSelected.value[o];
 if (!ops.some((x) => opSelected.value[x])) {
 opSelected.value[o] = true;
 }
}
function printPaper() {
 window.print();
}
function downloadTXT() {
 const lines: string[] = [];
 lines.push('口算答题卡');
 lines.push(`运算类型：${enabledOps.value.join(' ')} 最大数：${maxNum.value}`);
 lines.push('');
 questions.value.forEach((q, i) => {
 lines.push(`${i + 1}. ${q.q}=${showAnswer.value ? q.a : ''}`);
 });
 const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `口算答题卡.txt`;
 a.click();
 URL.revokeObjectURL(url);
}
const enabledOps = computed(() => ops.filter((o) => opSelected.value[o]));
const rows = computed(() => {
 const result: Array<typeof questions.value> = [];
 for (let i = 0; i < questions.value.length; i += 10) {
 result.push(questions.value.slice(i, i + 10));
 }
 return result;
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sakura-50 via-butter-50 to-mint-50 p-4">
    <ToolPageHeader icon="📋" title="口算答题卡" description="生成标准答题卡格式，每行10题，共200题" />
    
    <div class="max-w-4xl mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">运算类型</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="op in ops"
                :key="op"
                @click="toggleOp(op)"
                class="px-4 py-2 rounded-lg font-bold text-lg transition"
                :class="[
                  opSelected[op]
                    ? 'bg-gradient-to-r from-sky2-500 to-mint-500 text-white shadow-md'
                    : 'bg-cocoa-100 text-cocoa-500 hover:bg-cocoa-200'
                ]"
              >
                {{ op }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">最大数字</label>
            <select
              v-model="maxNum"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option :value="10">10 以内</option>
              <option :value="20">20 以内</option>
              <option :value="50">50 以内</option>
              <option :value="100">100 以内</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="gen"
            class="flex-1 py-3 bg-gradient-to-r from-sky2-500 to-mint-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center justify-center gap-2"
          >
            <RefreshCw :size="20" />
            生成答题卡
          </button>
          <button
            @click="showAnswer = !showAnswer"
            class="px-6 py-3 bg-cocoa-100 text-cocoa-700 rounded-xl font-medium hover:bg-cocoa-200 transition"
          >
            {{ showAnswer ? '隐藏答案' : '显示答案' }}
          </button>
          <button
            @click="printPaper"
            class="px-6 py-3 bg-cocoa-100 text-cocoa-700 rounded-xl font-medium hover:bg-cocoa-200 transition flex items-center gap-2"
          >
            <Printer :size="20" />
            打印
          </button>
          <button
            @click="downloadTXT"
            class="px-6 py-3 bg-cocoa-100 text-cocoa-700 rounded-xl font-medium hover:bg-cocoa-200 transition flex items-center gap-2"
          >
            <Download :size="20" />
            下载
          </button>
        </div>
      </div>

      <div v-if="questions.length" class="bg-white rounded-2xl shadow-soft p-6">
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold text-cocoa-700">口算答题卡</h2>
          <p class="text-sm text-cocoa-500">{{ enabledOps.join(' ') }} 运算 · 最大数：{{ maxNum }}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
          <div
            v-for="(row, rowIndex) in rows"
            :key="rowIndex"
            class="flex flex-wrap gap-2"
          >
            <div
              v-for="(q, colIndex) in row"
              :key="colIndex"
              class="flex items-center gap-1 text-sm font-mono"
              :class="showAnswer ? 'text-cocoa-700' : 'text-cocoa-600'"
            >
              <span class="text-cocoa-400 w-6">{{ (rowIndex * 10 + colIndex + 1).toString().padStart(3, ' ') }}.</span>
              <span>{{ q.q }}</span>
              <span class="text-cocoa-400">=</span>
              <span v-if="showAnswer" class="text-mint-600 font-bold w-8">{{ q.a.toString().padStart(3, ' ') }}</span>
              <span v-else class="border-b border-cocoa-300 w-8"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-white rounded-xl shadow-softer p-4 text-sm text-cocoa-500">
        <h3 class="font-bold mb-2">使用说明</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>选择运算类型（支持多选）：加法、减法、乘法、除法</li>
          <li>选择最大数字范围：10以内、20以内、50以内、100以内</li>
          <li>点击「生成答题卡」生成200道题目</li>
          <li>每行10题，共20行，标准答题卡格式</li>
          <li>点击「显示答案」查看正确答案用于批改</li>
          <li>支持打印和下载为 TXT 文件</li>
        </ul>
      </div>
    </div>
  </div>
</template>