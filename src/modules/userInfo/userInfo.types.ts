export type UserInfoResponce = Record<string , any>;
export interface UserInfoListQuery {
    page: number;
    limit : number;
    search?: string;
    isActive?: boolean;
}

export interface PaginatedUserInfo{
    data: UserInfoResponce[];
    Pagination: {
        page:number;
        limit: number;
        total: number;
        totalPages: number;
    };
} 