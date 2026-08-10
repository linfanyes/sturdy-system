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
import { type Ref } from 'vue';
export declare function usePagedList(loadFn: (params: Record<string, any>) => Promise<any[] | {
    items: any[];
    total?: number;
}>, defaultPageSize?: number, totalRef?: {
    value: number;
}): {
    page: Ref<number, number>;
    pageSize: Ref<number, number>;
    total: Ref<number, number>;
    allItems: Ref<any[], any[]>;
    keyword: Ref<string, string>;
    classId: Ref<string, string>;
    loadList: () => Promise<void>;
    resetAndReload: () => void;
    goPage: (p: number) => void;
    prevPage: () => void;
    nextPage: () => void;
};
//# sourceMappingURL=usePagedList.d.ts.map