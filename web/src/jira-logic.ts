import {
    bulkCreateIssue,
    createIssue,
    fetchIssue,
    getMyselfInfo,
    getProject,
    Issue,
    IssueCreateResult,
    IssueType,
    linkIssues,
    ProjectDetail,
    QueriedIssue,
    QueriedUser,
    queryUser,
    searchIssues,
    SEATALK_PRJ_KEY,
    UserInfo
} from "./jira-node-service"

export interface Context {
    project: ProjectDetail,
    epic?: IssueType,
    task?: IssueType,
    subtask?: IssueType
    myself: UserInfo
}

let progressLogger = (msg: string): void => {
    console.log(msg)
};

export function setProcesser(processor: (msg: string) => void) {
    progressLogger = processor;
}

function collectInfo(fetch: boolean = true): Promise<Context> {
    progressLogger(`begin collecting information.`)

    return getProject(fetch).then((detail) => {
        let epicInfo = detail.issueTypes.find((item) => {
            return item.name == "Epic";
        })

        let taskInfo = detail.issueTypes.find((item) => {
            return item.name == "Task";
        })

        let subTaskInfo = detail.issueTypes.find((item) => {
            return item.name == "Sub-task";
        })

        return new Promise<Context>((resolve, reject) => {
            getMyselfInfo(fetch).then((info) => {
                progressLogger(`Finish obtain current user information. ${info.name}`)
                resolve({
                    project: detail,
                    epic: epicInfo,
                    task: taskInfo,
                    subtask: subTaskInfo,
                    myself: info
                })
            }).catch((err) => {
                progressLogger(`Face error when obtaining current user information. ${err}`)
                reject(err)
            })
        })
    })
}

export interface IssueInfo {
    summary: string,
    assignee: string,
    labels: string[],
    description: string,
    components: string[],
    isTech: boolean,
}

function namesToComponents(names: string[], ctx: Context): { id: string }[] {
    return names.map((each) => {
        return ctx.project.components.find((value) => {
            return value.name == each;

        })
    }).map((item) => {
        return {
            id: item?.id ?? ""
        }
    })
}

export function createEpic(info: IssueInfo, fetchCtx: boolean = true): Promise<Issue> {
    progressLogger(`Begin creating epic: ${info.summary}`)
    let summary = info.summary;
    if (info.isTech && !summary.startsWith('【Tech】')) {
        summary = `【Tech】${summary}`
    }
    return collectInfo(fetchCtx).then((ctx) => {
        let request = {
            fields: {
                project: {
                    id: ctx.project.id
                },
                summary: summary,
                customfield_10003: info.summary,
                issuetype: {
                    id: ctx.epic?.id ?? ""
                },
                assignee: {
                    name: info.assignee
                },
                reporter: {
                    name: ctx.myself.name
                },
                labels: info.labels,
                description: info.description == "" ? undefined : info.description,
                components: namesToComponents(info.components, ctx)
            }
        }
        return createIssue(request).then((result) => {
            progressLogger(`Finished creating epic: ${result.key}/${info.summary}`)
            console.log(`create issue result => ${JSON.stringify(result)}`)
            return fetchIssue(result.id)
        })
    })
}

export interface FunctionInfo extends IssueInfo {
    epicKey: string,
}

export function createFunction(info: FunctionInfo, fetchCtx: boolean = true): Promise<Issue> {
    progressLogger(`Begin creating function task: ${info.summary}`)
    return collectInfo(fetchCtx).then((ctx) => {
        let summary;
        if (!info.summary.toString().includes(`【${info.labels[0]}】`)) {
            summary = `【${info.labels[0]}】${info.summary}`;
        }
        if (!info.summary.toString().startsWith("【Function】")) {
            summary = `【Function】${summary}`;
        } else {
            summary = info.summary;
        }
        let request = {
            fields: {
                project: {
                    id: ctx.project.id
                },
                summary: summary,
                customfield_10003: undefined,
                issuetype: {
                    id: ctx.task?.id ?? ""
                },
                assignee: {
                    name: info.assignee
                },
                reporter: {
                    name: ctx.myself.name
                },
                labels: info.labels,
                description: info.description == "" ? undefined : info.description,
                components: namesToComponents(info.components, ctx)
            }
        }
        return createIssue(request).then((result: IssueCreateResult) => {
            progressLogger(`Finish creating function task: ${result.key}/${info.summary}`)
            return new Promise<IssueCreateResult>((resolve, reject) => {
                progressLogger(`Begin linking Epic & function task: ${info.epicKey} <--> ${result.key}`)
                linkIssues({
                    type: {
                        name: "Hierarchy link (WBSGantt)"
                    },
                    inwardIssue: {
                        key: info.epicKey
                    },
                    outwardIssue: {
                        key: result.key
                    }
                }).then((_success) => {
                    progressLogger(`Finish linking Epic & function task: ${info.epicKey} <--> ${result.key}`)
                    resolve(result)
                }).catch((err) => {
                    progressLogger(`Facing error when linking Epic & function task: ${info.epicKey} <--> ${result.key}, error: ${err}`)
                    //return result whenever.
                    resolve(result)
                })
            })
        }).then((result: IssueCreateResult) => {
            progressLogger(`Finish creating function task: ${result.key}/${info.summary}`)
            console.log(`create issue result => ${JSON.stringify(result)}`)
            return fetchIssue(result.id)
        })
    })
}

export interface SubTaskInfo extends IssueInfo {
    parentKey: string,
    storyPoints: number
}

export function createSubTasks(info: SubTaskInfo[], callback: (issue: Issue) => void, fetchCtx: boolean = true) {
    collectInfo(fetchCtx).then((ctx) => {
        let request = {
            issueUpdates: info.map((item) => {
                let summary;
                if (!item.summary.startsWith(`【${item.labels[0]}】`)) {
                    summary = `【${item.labels[0]}】${item.summary}`
                } else {
                    summary = item.summary
                }

                progressLogger(`Begin bulk creating sub tasks: ${summary}`)

                return {
                    fields: {
                        project: {
                            id: ctx.project.id
                        },
                        parent: {
                            key: item.parentKey
                        },
                        summary: summary,
                        customfield_10003: undefined,
                        customfield_10100: item.storyPoints,
                        issuetype: {
                            id: ctx.subtask?.id ?? ""
                        },
                        assignee: {
                            name: item.assignee
                        },
                        reporter: {
                            name: ctx.myself.name
                        },
                        labels: item.labels,
                        description: item.description == "" ? undefined : item.description,
                        components: namesToComponents(item.components, ctx)
                    }
                }
            })
        }

        bulkCreateIssue(request).then((result) => {
            progressLogger(`End bulk creating sub tasks: ${result.issues.length}`)
            result.issues.forEach((item) => {
                progressLogger(`Begin fetching issue information for ${item.key}`)
                fetchIssue(item.id).then((issue) => {
                    progressLogger(`End fetching issue information for ${item.key}`)
                    callback(issue)
                }).catch((err) => {
                    progressLogger(`Facing error when fetching issue information for ${item.key}, error: ${err}`)
                    console.log(`fetch sub task issue error: ${err}`)
                })
            })
        }).catch((err) => {
            progressLogger(`Facing error when bulk creating sub tasks: ${err}`)
            console.error(`buld create sub tasks error: ${err}`)
        })
    })
}

export function createFunctionAndSubTasks(task: FunctionInfo, subtasks: SubTaskInfo[], callback: (issue: Issue) => void) {
    console.log(`begin create function for ${JSON.stringify(task)}`)
    createFunction(task, true).then((functionIssue) => {
        subtasks.forEach((item) => {
            item.parentKey = functionIssue.key
        })

        callback(functionIssue);
        progressLogger(`Begin creating sub tasks.`)
        createSubTasks(subtasks, (issue) => {
            progressLogger(`Finish creating sub task: ${issue.key}}.`)
            callback(issue)
        }, false)
    }).catch((err) => {
        progressLogger(`Facing error when creating Function Task: ${task.summary}, error: ${err}`)
    })
}

export function createEpicFuncSubTasks(epic: IssueInfo, task: FunctionInfo, subtasks: SubTaskInfo[], callback: (issue: Issue) => void) {
    progressLogger(`Begin creating epic for ${JSON.stringify(epic)}`)
    createEpic(epic, true).then((epicIssue) => {
        callback(epicIssue)

        task.epicKey = epicIssue.key
        console.log(`begin create function for ${JSON.stringify(task)}`)
        createFunction(task, false).then((functionIssue) => {
            callback(functionIssue);

            subtasks.forEach((item) => {
                item.parentKey = functionIssue.key
            })
            console.log(`begin create sub tasks for ${JSON.stringify(subtasks)}`)
            createSubTasks(subtasks, (issue) => {
                callback(issue)
            }, false)
        }).catch((err) => {
            progressLogger(`Facing error when creating function: ${task.summary}, error: ${err}`)
        })
    }).catch((err) => {
        progressLogger(`Facing error when creating epic: ${epic.summary}, error: ${err}`)
    })

}

let searchTimer: NodeJS.Timeout;

export function userSearch(value: string, max: number): Promise<QueriedUser[]> {
    return new Promise<QueriedUser[]>((resolve, reject) => {
        if (!value || value == "") {
            resolve([])
            return
        }
        clearTimeout(searchTimer)
        searchTimer = setTimeout(() => {
            queryUser(value, max).then((list) => {
                console.log(`query user result: ${JSON.stringify(list)}`)
                let users = list.users.users ?? [];
                // 由于查询出来的匹配规则不好，这里调整下。
                let cur = 0
                for (let i = 0; i < users.length; i++) {
                    if (users[i].name.startsWith(value)) {
                        let temp = users[cur]
                        users[cur] = users[i]
                        users[i] = temp
                        cur = i;
                    }
                }
                resolve(users)
            }).catch((err) => {
                console.error(`query user error: ${err}`)
                reject(err)
            })
        }, 200)
    })
}

const debounceSearch = (value: string, jql: string, timeout: number): Promise<QueriedIssue[]> => {
    return new Promise<QueriedIssue[]>((resolve, reject) => {
        if (!value || value == "") {
            resolve([])
            return
        }

        clearTimeout(searchTimer)
        searchTimer = setTimeout(() => {
            searchIssues(jql, 0, 20).then((list) => {
                console.log(`query issues result: ${JSON.stringify(list)}`)
                resolve(list.issues)
            }).catch((err) => {
                console.error(`query issues error: ${err}`)
                reject(err)
            })
        }, timeout)
    })
}

export const epicSearch = (value: string): Promise<QueriedIssue[]> => {
    let jql;
    if (value.startsWith(`${SEATALK_PRJ_KEY}-`)) {
        jql = `project=${SEATALK_PRJ_KEY} AND type=Epic AND key='${value}' ORDER BY key DESC`;
    } else {
        jql = `project=${SEATALK_PRJ_KEY} AND type=epic AND summary ~'${value}' ORDER BY key DESC`;
    }
    return debounceSearch(value, jql, 200)
}

export const functionSearch = (value: string): Promise<QueriedIssue[]> => {
    let jql;
    if (value.startsWith(`${SEATALK_PRJ_KEY}-`)) {
        jql = `project=${SEATALK_PRJ_KEY} AND (type=Epic OR type=Task) AND key='${value}' ORDER BY key DESC`;
    } else {
        jql = `project=${SEATALK_PRJ_KEY} AND (type=Epic OR type=Task) AND summary ~'${value}' ORDER BY key DESC`;
    }
    return debounceSearch(value, jql, 200)
}