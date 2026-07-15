<script setup lang="ts">import { ref, computed } from 'vue';
import { RefreshCw, Printer, Download } from 'lucide-vue-next';
import ToolPageHeader from '../../components/common/ToolPageHeader.vue';
const opType = ref<'addition' | 'subtraction' | 'multiplication' | 'division'>('addition');
const count = ref(10);
const digitCount = ref(2);
const showAnswer = ref(false);
const questions = ref<{
 num1: number;
 num2: number;
 op: string;
 answer: number;
}[]>([]);
function gen() {
 const list: typeof questions.value = [];
 for (let i = 0; i < count.value; i++) {
 let num1: number, num2: number, answer: number;
 const maxVal = Math.pow(10, digitCount.value) - 1;
 const minVal = Math.pow(10, digitCount.value - 1);
 switch (opType.value) {
 case 'addition':
 num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
 num2 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
 answer = num1 + num2;
 break;
 case 'subtraction':
 num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
 num2 = Math.floor(Math.random() * (num1 - minVal + 1)) + minVal;
 answer = num1 - num2;
 break;
 case 'multiplication':
 num1 = Math.floor(Math.random() * 9) + 2;
 num2 = Math.floor(Math.random() * (maxVal - 9)) + 10;
 answer = num1 * num2;
 break;
 case 'division':
 num2 = Math.floor(Math.random() * 8) + 2;
 answer = Math.floor(Math.random() * 89) + 10;
 num1 = num2 * answer;
 break;
 default:
 num1 = 0;
 num2 = 0;
 answer = 0;
 }
 list.push({
 num1,
 num2,
 op: opType.value === 'addition' ? '+' : opType.value === 'subtraction' ? '-' : opType.value === 'multiplication' ? '×' : '÷',
 answer,
 });
 }
 questions.value = list;
 showAnswer.value = false;
}
function printPaper() {
 window.print();
}
function downloadTXT() {
 const lines: string[] = [];
 lines.push('竖式计算练习');
 lines.push(`运算类型：${opLabels[opType.value]} 题目数量：${count.value}`);
 lines.push('');
 questions.value.forEach((q, i) => {
 lines.push(`${i + 1}. ${q.num1} ${q.op} ${q.num2}`);
 lines.push('-------');
 if (showAnswer.value) {
 lines.push(` = ${q.answer}`);
 }
 lines.push('');
 });
 const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `竖式计算练习_${opLabels[opType.value]}.txt`;
 a.click();
 URL.revokeObjectURL(url);
}
const opLabels: Record<string, string> = {
 addition: '加法',
 subtraction: '减法',
 multiplication: '乘法',
 division: '除法',
};
const opOptions = [
 { value: 'addition', label: '加法', desc: '两位数加法（含进位）' },
 { value: 'subtraction', label: '减法', desc: '两位数减法（含退位）' },
 { value: 'multiplication', label: '乘法', desc: '一位数乘多位数' },
 { value: 'division', label: '除法', desc: '多位数除以一位数' },
];
const digitOptions = [
 { value: 2, label: '两位数' },
 { value: 3, label: '三位数' },
 { value: 4, label: '四位数' },
];
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-mint-50 via-sky2-50 to-butter-50 p-4">
    <ToolPageHeader icon="📐" title="竖式计算练习生成器" description="生成加减法进退位、乘法竖式、除法竖式练习题" />
    
    <div class="max-w-4xl mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">运算类型</label>
            <select
              v-model="opType"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option v-for="opt in opOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }} - {{ opt.desc }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">数字位数</label>
            <select
              v-model="digitCount"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option v-for="opt in digitOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-cocoa-600 mb-2">题目数量</label>
            <select
              v-model="count"
              class="w-full px-4 py-2 rounded-xl border border-cocoa-200 bg-cocoa-50 focus:outline-none focus:ring-2 focus:ring-sky2-500"
            >
              <option :value="5">5 题</option>
              <option :value="10">10 题</option>
              <option :value="20">20 题</option>
              <option :value="30">30 题</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="gen"
            class="flex-1 py-3 bg-gradient-to-r from-mint-500 to-sky2-500 text-white rounded-xl font-bold hover:shadow-md transition flex items-center justify-center gap-2"
          >
            <RefreshCw :size="20" />
            生成题目
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(q, index) in questions"
            :key="index"
            class="border border-cocoa-200 rounded-xl p-4"
          >
            <div class="flex items-end justify-end gap-1" style="font-size: 1.5rem; font-family: 'Courier New', monospace;">
              <div class="flex flex-col items-end">
                <span>{{ q.num1 }}</span>
                <div class="flex items-center">
                  <span class="text-cocoa-600 mr-1">{{ q.op }}</span>
                  <span>{{ q.num2 }}</span>
                </div>
                <div class="w-full border-t-2 border-cocoa-800 mt-1"></div>
                <span v-if="showAnswer" class="text-mint-600 font-bold mt-1">{{ q.answer }}</span>
                <span v-else class="text-cocoa-300 mt-1">____</span>
              </div>
            </div>
            <div class="text-center text-sm text-cocoa-400 mt-2">第 {{ index + 1 }} 题</div>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-white rounded-xl shadow-softer p-4 text-sm text-cocoa-500">
        <h3 class="font-bold mb-2">使用说明</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>选择运算类型：加法（含进位）、减法（含退位）、乘法、除法</li>
          <li>选择数字位数：两位数、三位数、四位数</li>
          <li>点击「生成题目」按钮生成练习题</li>
          <li>点击「显示答案」查看正确答案</li>
          <li>支持打印和下载为 TXT 文件</li>
        </ul>
      </div>
    </div>
  </div>
</template>