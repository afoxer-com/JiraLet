import got, {CancelableRequest} from "got";
import {JIRA_DOMAIN, JIRA_MYSELF_KEY, JIRA_PROJECT_DETAIL_KEY_PREFIX, JIRA_TOKEN_KEY} from "./Const";

let JIRA_TOKEN: string | undefined | null = null;
export const SEATALK_PRJ_KEY = "SPSTKSZ"
export const SEATALK_PRJ_ID = "18315"

export interface Issue {
    id: string,
    self: string,
    key: string,
    fields: {
        summary: string,
        assignee?: {
            self: string,
            name: string,
        },

        issuetype: {
            self: string,
            id: string,
            name: string,
        },

        creator: {
            self: string,
            name: string,
            key: string,
            emailAddress: string,
            displayName: string,
        },
        labels: string[],
        reporter: {
            self: string,
            name: string,
            key: string,
            emailAddress: string,
            displayName: string,
        },
    }
}

export function fetchIssue(issueId: string): Promise<Issue> {
    return got.get(`https://${JIRA_DOMAIN}/rest/api/2/issue/${issueId}`, {
        headers: {
            "Authorization": `Bearer ${jiraToken()}`
        },
    }).json<Issue>()
}

export interface QueriedIssue {
    id: string,
    self: string,
    key: string,
    fields?: {
        summary?: string
    }
}

export interface SearchResult {
    startAt: number,
    maxResults: number,
    total: number,
    issues: QueriedIssue[]
}

export function searchIssues(jql: string, start: number, max: number): Promise<SearchResult> {
    return got.post(`https://${JIRA_DOMAIN}/rest/api/2/search`, {
        json: {
            jql: jql,
            startAt: start,
            maxResults: max,
            fields: [
                "summary"
            ]
        },
        headers: {
            "Authorization": `Bearer ${jiraToken()}`,
        },
    }).json<SearchResult>()
}

export interface IssueCreateResult {
    id: string,
    key: string,
    self: string
}

export interface IssueCreateRequest {
    fields: {
        parent?: {
            key: string
        }
        project: {
            id: string
        },
        summary: string,
        // epic name
        customfield_10003?: string,
        // story points
        customfield_10100?: number,
        issuetype: {
            id: string
        },
        assignee?: {
            name?: string
        },
        reporter?: {
            name?: string
        },
        labels: string[],
        description?: string,
        components?:
            {
                id: string
            }[]

    }
}

export function createIssue(request: IssueCreateRequest): Promise<IssueCreateResult> {
    console.log(`begin create issue: ${JSON.stringify(request)}`)
    return got.post(`https://${JIRA_DOMAIN}/rest/api/2/issue`, {
        json: request,
        headers: {
            "Authorization": `Bearer ${jiraToken()}`,
        },
    }).json<IssueCreateResult>()
}

export interface BulkCreateRequest {
    issueUpdates: IssueCreateRequest[]
}

export interface BulkCreateResult {
    issues: IssueCreateResult[]
    errors: any[]
}

export function bulkCreateIssue(request: BulkCreateRequest): Promise<BulkCreateResult> {
    console.log(`begin create issue: ${JSON.stringify(request)}`)
    return got.post(`https://${JIRA_DOMAIN}/rest/api/2/issue/bulk`, {
        json: request,
        headers: {
            "Authorization": `Bearer ${jiraToken()}`,
        },
    }).json<BulkCreateResult>()
}

export interface LinkRequest {
    type: {
        name: string
    },
    inwardIssue: {
        key: string
    },
    outwardIssue: {
        key: string
    }
}


export function linkIssues(request: LinkRequest): Promise<boolean> {
    console.log(`begin link issue: ${JSON.stringify(request)}`)
    return got.post(`https://${JIRA_DOMAIN}/rest/api/2/issueLink`, {
        json: request,
        headers: {
            "Authorization": `Bearer ${jiraToken()}`,
        },
    }).then((result) => {
        return new Promise<boolean>((resolve, reject) => {
            resolve(true);
        })
    }).catch((err) => {
        console.error(`link issue error: ${err}`)
        return new Promise<boolean>((resolve, reject) => {
            resolve(false);
        })
    })
}

export interface Project {
    self: string,
    id: string,
    key: string,
    name: string,
    avatarUrls: {
        [key: string]: string,
    },
    projectCategory: {
        self: string,
        id: string,
        name: string,
        description: string
    }
}

export function getProjects(): Promise<[Project]> {
    return got.get(`https://${JIRA_DOMAIN}/rest/api/2/project`, {
        headers: {
            "Authorization": `Bearer ${jiraToken()}`
        },
    }).json<[Project]>()
}

export interface IssueType {
    self: string,
    id: string,
    description: string,
    iconUrl: string,
    name: string,
    subtask: false,
    avatarId?: string
}

export interface ProjectDetail {
    expand: string,
    self: string,
    id: string,
    key: string,
    description: string,
    lead: {
        self: string,
        name: string,
        avatarUrls: {
            [key: string]: string
        },
        displayName: string,
        active: boolean
    },
    components:
        {
            self: string,
            id: string,
            name: string,
            description?: string,
        }[],
    issueTypes: IssueType[],
    url: string,
    email: string,
    assigneeType: string,
    versions:
        {
            self: string,
            id: string,
            name: string,
            archived: boolean,
            released: boolean,
            releaseDate: string,
            userReleaseDate: string,
            projectId: string
        }[],
    name: string,
    roles: {
        [key: string]: string
    },
    avatarUrls: {
        [key: string]: string
    },
    projectCategory: {
        self: string,
        id: string,
        name: string,
        description: string
    }
}

export function getProject(fetch: boolean = true): Promise<ProjectDetail> {
    return new Promise((resolve, reject) => {
        let detail = projectDetail(SEATALK_PRJ_KEY);
        if (!detail) {
            // 如果是空的，得等到网络的返回结果。
            fetchProject().then((result) => {
                console.log(`obtain project info: ${JSON.stringify(result)}`)
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        } else {
            if (fetch) {
                // 如果缓存有数据，可以直接返回，但也请求网络，网络数据下次生效。
                fetchProject().then((result) => {
                    console.log(`obtain project info: ${JSON.stringify(result)}`)
                    // do nothing.
                }).catch((error) => {
                    // do nothing.
                })
            }
            resolve(detail);
        }
    })
}

function fetchProject(): Promise<ProjectDetail> {
    return got.get(`https://${JIRA_DOMAIN}/rest/api/2/project/${SEATALK_PRJ_KEY}`, {
        headers: {
            "Authorization": `Bearer ${jiraToken()}`
        },
    }).json<ProjectDetail>().then((result) => {
        saveProjectDetail(result);
        return result;
    })
}

export interface QueriedUser {
    name: string,
    key: string,
    html?: string,
    displayName: string
}

export interface QueriedUsers {
    users: {
        users?: QueriedUser[],
        total: number
    },
    groups?: {
        total: number,
        groups?: {}[]
    }
}

export function queryUser(keyword: string, max: number): Promise<QueriedUsers> {
    return got.get(`https://${JIRA_DOMAIN}/rest/api/2/groupuserpicker?query=${keyword}&maxResults=${max}&projectId=${SEATALK_PRJ_ID}`, {
        headers: {
            "Authorization": `Bearer ${jiraToken()}`
        },
    }).json<QueriedUsers>()
}

export function jiraToken(): string {
    if (!JIRA_TOKEN) {
        let storage = window.localStorage;
        JIRA_TOKEN = storage.getItem(JIRA_TOKEN_KEY) ?? "";
    }

    return JIRA_TOKEN;
}

export function saveJiraToken(jira_token: string) {
    JIRA_TOKEN = jira_token;
    let storage = window.localStorage;
    storage.setItem(JIRA_TOKEN_KEY, jira_token);
}

export function saveProjectDetail(projectDetail: ProjectDetail) {
    let storage = window.localStorage;
    let key = `${JIRA_PROJECT_DETAIL_KEY_PREFIX}_${projectDetail.key}`
    storage.setItem(key, JSON.stringify(projectDetail))
}

function projectDetail(prjKey: string): ProjectDetail | null {
    let storage = window.localStorage;
    let key = `${JIRA_PROJECT_DETAIL_KEY_PREFIX}_${prjKey}`
    let result = storage.getItem(key);
    if (!result) {
        return null;
    }

    return JSON.parse(result)
}

export interface UserInfo {
    self: string,
    name: string,
    emailAddress: string,
    avatarUrls?: {
        [key: string]: string,
    },
    displayName: string,
}


function myself(): UserInfo | null {
    let storage = window.localStorage;
    let result = storage.getItem(JIRA_MYSELF_KEY);
    if (!result) {
        return null;
    }

    return JSON.parse(result)
}

export function getMyselfInfo(fetch: boolean = true): Promise<UserInfo> {
    return new Promise((resolve, reject) => {
        let info = myself();
        if (!info) {
            // 如果是空的，得等到网络的返回结果。
            fetchMyselfInfo().then((result) => {
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        } else {
            if (fetch) {
                // 如果缓存有数据，可以直接返回，但也请求网络，网络数据下次生效。
                fetchMyselfInfo().then((result) => {
                    // do nothing.
                }).catch((error) => {
                    // do nothing.
                })
            }
            resolve(info);
        }
    })
}

function fetchMyselfInfo(): Promise<UserInfo> {
    console.log(`begin fetch myself info.`)
    return got.get(`https://${JIRA_DOMAIN}/rest/api/2/myself`, {
        headers: {
            "Authorization": `Bearer ${jiraToken()}`
        },
    }).json<UserInfo>()
}

