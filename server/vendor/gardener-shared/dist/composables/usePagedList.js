"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePagedList = usePagedList;
/**
 * 可复用的分页列表逻辑 composable
 *
 * 默认每页 10 条，支持用户修改每页条数（5/10/20/50）。
 * 无搜索关键词时走后端 skip/take 分页；
 * 有搜索关键词时先拉取 500 条到前端缓存，再由前端过滤分页展示。
 *
 * 注意：filtered / totalFiltered / totalPages / displayedItems 由调用者自行定义，
 * 以便各页面可按需定制过滤逻辑。
 */
const vue_1 = require("vue");
function usePagedList(loadFn, defaultPageSize = 10, totalRef) {
    const page = (0, vue_1.ref)(0);
    const pageSize = (0, vue_1.ref)(defaultPageSize);
    const total = (0, vue_1.ref)(0);
    const allItems = (0, vue_1.ref)([]);
    const keyword = (0, vue_1.ref)('');
    const classId = (0, vue_1.ref)('');
    async function loadList() {
        const isSearching = !!keyword.value.trim();
        const params = {
            skip: isSearching ? 0 : page.value * pageSize.value,
            take: isSearching ? 500 : pageSize.value,
        };
        if (classId.value)
            params.classId = classId.value;
        const res = await loadFn(params);
        let arr = [];
        let totalVal = 0;
        if (Array.isArray(res)) {
            arr = res;
            totalVal = res.length;
        }
        else {
            arr = res?.items || [];
            totalVal = res?.total ?? arr.length;
        }
        allItems.value = arr;
        total.value = totalVal;
        page.value = 0;
    }
    function resetAndReload() {
        page.value = 0;
        loadList();
    }
    (0, vue_1.watch)(classId, resetAndReload);
    (0, vue_1.watch)(keyword, resetAndReload);
    function goPage(p) {
        const totalItems = totalRef?.value ?? allItems.value.length;
        const maxPage = Math.max(0, Math.ceil((totalItems || 0) / pageSize.value) - 1);
        page.value = Math.min(Math.max(0, p), maxPage);
        if (!keyword.value.trim()) {
            loadList();
        }
    }
    function prevPage() { goPage(page.value - 1); }
    function nextPage() { goPage(page.value + 1); }
    return {
        page,
        pageSize,
        total,
        allItems,
        keyword,
        classId,
        loadList,
        resetAndReload,
        goPage,
        prevPage,
        nextPage,
    };
}
//# sourceMappingURL=usePagedList.js.map