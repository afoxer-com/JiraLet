import { useState, useRef } from 'react'
import { AutoComplete, Button, Divider, Drawer, Form, Input, List, message, Select, Space } from 'antd';
import {
    Issue,
    jiraToken,
    QueriedIssue,
    SEATALK_PRJ_KEY
} from './jira-node-service';
import TextArea from 'antd/es/input/TextArea';
import {
    createEpic, createEpicFuncSubTasks,
    createFunction,
    createFunctionAndSubTasks,
    createSubTasks,
    epicSearch,
    functionSearch,
    setProcesser,
    SubTaskInfo,
    userSearch
} from './jira-logic';
import { FormInstance, Rule, RuleObject } from 'antd/es/form';
import { StoreValue } from 'antd/es/form/interface';
const taskRegex = /^(.*\S+)\s+(\d+(\.\d+)?)$/
const defaultMode = "function-sub";

function Jira(props: { onJiraTokenEmpty: () => void }) {
    const [curMode, setCurMode] = useState(defaultMode);
    const [createdIssues, setCreatedIssues] = useState<Issue[]>([]);
    const [userList, setUserList] = useState<{ value: string }[]>([]);
    const [epicList, setEpicList] = useState<QueriedIssue[]>();
    const [epicValue, setEpicValue] = useState<string>("");
    const formRef = useRef<null | FormInstance>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [process, setProcess] = useState<string[]>([]);

    setProcesser((msg) => {
        console.log(msg)
        setProcess((prev) => {
            prev.push(msg);
            return prev;
        })
    })

    const onRootClick = (e: any) => {
        if (jiraToken() == "") {
            const { dialog } = require('@electron/remote');
            dialog.showMessageBox(null, {
                type: "info",
                message: "你还没有设置JIRA的Personal Token，无法访问JIRA",
            }).then((response: number, checkboxChecked: boolean) => {
                console.log("You responsed on JIRA dialog.")
                props.onJiraTokenEmpty()
            });
        }
    }

    const onFormFinish = (fieldsValue: any): void => {
        console.log(`form finished: ${JSON.stringify(fieldsValue)}`)
        let components: [string] = fieldsValue['components']
        let labels: string = fieldsValue['labels']
        let epic_title: string = fieldsValue['epic'] ?? ""
        let function_title: string = fieldsValue['function'] ?? ""
        let subtasks: string = fieldsValue['sub'] ?? ""
        let description: string = fieldsValue['description'] ?? ""
        let assignee: string = fieldsValue['assignee'] ?? ""

        const collectSubtasks = (): SubTaskInfo[] => {
            console.log('begin collecting sub tasks.')
            let result = []
            let subAssignee = ""
            let lines = subtasks.split('\n');
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line == "") {
                    break;
                } else if (line.startsWith("assignee:")) {
                    subAssignee = line.replace("assignee:", "").trim()
                } else {
                    let arr = taskRegex.exec(line);
                    if (arr == null || arr.length < 3) {
                        throw new Error(`You input wrong subtask: ${line}`)
                    } else {
                        let summary = arr[1].trim();
                        let storyPoints = arr[2].trim();
                        result.push({
                            summary: summary,
                            assignee: subAssignee,
                            labels: [labels],
                            description: description,
                            components: components,
                            parentKey: epic_title,
                            storyPoints: Number.parseFloat(storyPoints)
                        })
                    }
                }
            }
            console.log(`end collecting sub tasks. ${JSON.stringify(result)}`)
            return result;
        };

        switch (curMode) {
            case "epic": {
                createEpic({
                    summary: epic_title,
                    assignee: assignee,
                    labels: [labels],
                    description: description,
                    components: components
                }).then((issue) => {
                    console.log(`abtain issue result after create => ${JSON.stringify(issue)}`)
                    updateCreatedIssues(issue)
                }).catch((err) => {
                    console.error(`Err when create issue => ${err}`)
                })
                break;
            }
            case "function": {
                createFunction({
                    epicKey: epic_title,
                    summary: function_title,
                    assignee: assignee,
                    labels: [labels],
                    description: description,
                    components: components
                }).then((issue: Issue) => {
                    console.log(`abtain issue result after create => ${JSON.stringify(issue)}`)
                    updateCreatedIssues(issue)
                }).catch((err) => {
                    console.error(`Err when create issue => ${err}`)
                })
                break;
            }
            case "sub": {
                createSubTasks(collectSubtasks(), (issue) => {
                    console.log(`create sub task result => ${issue.key}`)
                    updateCreatedIssues(issue)
                })
                break;
            }
            case "function-sub": {
                createFunctionAndSubTasks({
                    epicKey: epic_title,
                    summary: function_title,
                    assignee: assignee,
                    labels: [labels],
                    description: description,
                    components: components
                }, collectSubtasks(), (issue) => {
                    console.log(`create sub & function task result => ${issue.key}`)
                    updateCreatedIssues(issue)
                })
                break;
            }
            case "epic-function-sub": {
                createEpicFuncSubTasks({
                    summary: epic_title,
                    assignee: assignee,
                    labels: [labels],
                    description: description,
                    components: components
                }, {
                    epicKey: epic_title,
                    summary: function_title,
                    assignee: assignee,
                    labels: [labels],
                    description: description,
                    components: components
                }, collectSubtasks(), (issue) => {
                    console.log(`create sub & function & epic task result => ${issue.key}`)
                    updateCreatedIssues(issue)
                })
                break;
            }
        }
    }

    const updateCreatedIssues = (issue: Issue): void => {
        setCreatedIssues((prev) => {
            let list: Issue[] = [];
            prev.forEach((value) => {
                console.log(`forEach`)
                list.push(value)
            })
            list.push(issue)
            console.log(`update creagted issues, count = ${list.length}`)
            return list
        })
    }

    interface Mode {
        description: string,
        config: {
            epicEnable: boolean,
            functionEnable: boolean,
            subEnable: boolean,
            assigneeEnable: boolean,
            epicLabel: string,
            functionLabel: string,
            subLabel: string,
            epicSeachFn?: (value: string) => void,
            epicPlaceHolder: string,
            epicRules: Rule[],
            functionRules: Rule[],
            subRules: Rule[],
            assigneeRules: Rule[],
        }
    }

    interface ModeConfig {
        [key: string]: Mode
    }

    const epicSearchFunction = (value: string) => {
        epicSearch(value).then((list) => {
            setEpicList((prev) => {
                return list;
            })
        })
    }

    const functionSearchFunction = (value: string) => {
        functionSearch(value).then((list) => {
            setEpicList((prev) => {
                return list;
            })
        })
    }

    const subTaskValidator = (rule: RuleObject, value: string, callback: (error?: string) => void): any => {
        let lines = value.split('\n');
        let hasAssignee = false;
        if (value == "") {
            callback("Sub-Task can't be empty!")
        }
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line == "") {
                // skip empty line
                continue
            } else if (line.startsWith("assignee:")) {
                let emailRegex = /^\S+@\S+$/
                let email = line.replace("assignee:", "").trim()
                if (!emailRegex.test(email)) {
                    callback(`line ${i + 1} wrong: You should write the correct email address by 'assignee: xxx@shopee.com', currently it is '${email}'.`)
                }
                hasAssignee = true;
                continue
            } else {
                if (!hasAssignee) {
                    callback(`line ${i + 1} wrong: You should first present a assignee by 'assignee: xxx@shopee.com' before input tasks.`)
                    break
                }
                let arr = taskRegex.exec(line);
                if (arr == null || arr.length < 3) {
                    callback(`line ${i + 1} wrong: should be 'summary storypoints' or 'assignee: xxx@shopee.com', but ${line}`)
                    break
                }
            }
        }
        callback()
    }

    const modes: ModeConfig = {
        "epic-function-sub": {
            description: "创建Epic, Function-Task和Sub-Task",
            config: {
                epicEnable: true,
                functionEnable: true,
                subEnable: true,
                assigneeEnable: true,
                epicLabel: "Epic Title: ",
                functionLabel: "Function title: ",
                subLabel: "Sub-Task list: ",
                epicSeachFn: undefined,
                epicPlaceHolder: "请输入",
                epicRules: [{ required: true, message: "Epic title can't be empty!" }],
                functionRules: [{ required: true, message: "Function title can't be empty!" }],
                subRules: [{ required: true, message: "Sub-Task can't be empty!" }, { validator: subTaskValidator }],
                assigneeRules: [{ required: true, message: "Assignee can't be empty!" }],
            }
        },
        "function-sub": {
            description: "创建Function-Task和Sub-Task",
            config: {
                epicEnable: true,
                functionEnable: true,
                subEnable: true,
                assigneeEnable: true,
                epicLabel: "Epic ticket: ",
                functionLabel: "Function title: ",
                subLabel: "Sub-Task list: ",
                epicSeachFn: epicSearchFunction,
                epicPlaceHolder: "输入可以进行搜索",
                epicRules: [{ required: true, message: "Parent ticket can't be empty!" }, {
                    validator: (rule, value, callback) => {
                        if (!value) {
                            callback("Parent ticket can't be empty!")
                        } else if (!value.startsWith(`${SEATALK_PRJ_KEY}-`)) {
                            callback(`Epic ticket must start with ${SEATALK_PRJ_KEY}-`)
                        } else {
                            callback()
                        }
                    }
                }],
                functionRules: [{ required: true, message: "Function title can't be empty!" }],
                subRules: [{ required: true, message: "Sub-Task can't be empty!" }, { validator: subTaskValidator }],
                assigneeRules: [{ required: true, message: "Assignee can't be empty!" }],
            }
        },
        "sub": {
            description: "只创建Sub-Task",
            config: {
                epicEnable: true,
                functionEnable: false,
                subEnable: true,
                assigneeEnable: false,
                epicLabel: "Parent ticket: ",
                functionLabel: "Function ticket: ",
                subLabel: "Sub-Task list: ",
                epicSeachFn: functionSearchFunction,
                epicPlaceHolder: "请输入",
                epicRules: [{ required: true, message: "Parent ticket can't be empty!" }, {
                    validator: (rule, value, callback) => {
                        if (!value) {
                            callback("Parent ticket can't be empty!")
                        } else if (!value.startsWith(`${SEATALK_PRJ_KEY}-`)) {
                            callback(`Epic ticket must start with ${SEATALK_PRJ_KEY}-`)
                        } else {
                            callback()
                        }
                    }
                }],
                functionRules: [],
                subRules: [{ required: true, message: "Sub-Task can't be empty!" }, { validator: subTaskValidator }],
                assigneeRules: [],
            }
        },
        "function": {
            description: "只创建Function-Task",
            config: {
                epicEnable: true,
                functionEnable: true,
                subEnable: false,
                assigneeEnable: true,
                epicLabel: "Epic ticket: ",
                functionLabel: "Function Title: ",
                subLabel: "Sub-Task list: ",
                epicSeachFn: epicSearchFunction,
                epicPlaceHolder: "可输入关键字进行搜索",
                epicRules: [{ required: true, message: "Epic ticket can't be empty!" }, {
                    validator: (rule, value, callback) => {
                        if (!value) {
                            callback("Epic ticket can't be empty!")
                        } else if (!value.startsWith(`${SEATALK_PRJ_KEY}-`)) {
                            callback(`Epic ticket must start with ${SEATALK_PRJ_KEY}-`)
                        } else {
                            callback()
                            console.log(`validate epic sucess, ${value}`)
                        }
                    }
                }],
                functionRules: [{ required: true, message: "Function title can't be empty!" }],
                subRules: [],
                assigneeRules: [{ required: true, message: "Assignee can't be empty!" }],
            }
        },
        "epic": {
            description: "只创建Epic",
            config: {
                epicEnable: true,
                functionEnable: false,
                subEnable: false,
                assigneeEnable: true,
                epicLabel: "Epic Title: ",
                functionLabel: "Function Title: ",
                subLabel: "Sub-Task list: ",
                epicSeachFn: undefined,
                epicPlaceHolder: "输入可以进行搜索",
                epicRules: [{ required: true, message: "Epic title can't be empty!" }],
                functionRules: [],
                subRules: [],
                assigneeRules: [{ required: true, message: "Assignee can't be empty!" }],
            }
        },
    }

    const onModeSelect = (value: string, option: any): void => {
        console.log(`mode is selected: ${value}`)
        setCurMode(value)
    }


    const showDrawer = () => {
        setDrawerOpen(true);
    };

    const onDrawerClose = () => {
        setDrawerOpen(false);
    };

    const drawerList = (): any => {
        const addItem = (item: string): any => {
            return <div>{item}</div>
        };

        return process.map((item) => {
            return addItem(item)
        })
    }

    return (
        <div onClick={onRootClick}>
            <Form ref={formRef}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 14 }}
                layout="horizontal"
                onFinish={onFormFinish}>
                <Form.Item name="mode" label="模式: ">
                    <Select defaultValue={defaultMode} onSelect={onModeSelect}>
                        {Object.keys(modes).map((key) => <Select.Option
                            value={key}>{(modes)[key].description}</Select.Option>)}
                    </Select>
                </Form.Item>
                {/* <Divider>核心内容</Divider> */}
                <Form.Item name="epic" label={modes[curMode].config.epicLabel}
                    hidden={!modes[curMode].config.epicEnable}
                    rules={modes[curMode].config.epicRules}>
                    <AutoComplete
                        showSearch
                        value={epicValue}
                        options={!epicList ? [] : epicList.map((item) => {
                            return { label: `[${item.key}] ${item.fields?.summary ?? ""}`, value: item.key }
                        })}
                        onSearch={modes[curMode].config.epicSeachFn}
                        placeholder={modes[curMode].config.epicPlaceHolder}
                    />
                </Form.Item>
                <Form.Item name="function" label={modes[curMode].config.functionLabel}
                    hidden={!modes[curMode].config.functionEnable}
                    rules={modes[curMode].config.functionRules}>
                    <Input />
                </Form.Item>
                <Form.Item name="assignee" label="Assignee"
                    hidden={!modes[curMode].config.assigneeEnable}
                    rules={modes[curMode].config.assigneeRules}>
                    <AutoComplete
                        options={userList}
                        onSearch={(value) => {
                            userSearch(value, 100).then((list) => {
                                setUserList((prev) => {
                                    return list?.map((item) => {
                                        return { value: item.name }
                                    }) ?? []
                                })
                            }).catch((err) => {
                                // do nothing.
                            })
                        }}
                        placeholder="输入可以进行搜索"
                    />
                </Form.Item>
                <Form.Item name="sub" label={modes[curMode].config.subLabel}
                    hidden={!modes[curMode].config.subEnable}
                    rules={modes[curMode].config.subRules}>
                    <TextArea rows={10} placeholder="assignee: xin.wang@shopee.com&#10;Task 1 summary 1.5&#10;Task 2 summary 1&#10;assignee: others@shopee.com&#10;Other task 1 summary 1.5&#10;Other task 2 summary 1" />
                </Form.Item>
                {/* <Divider>其他内容</Divider> */}

                <Form.Item name="components" label="Component: "
                    rules={[{ required: true, message: "Components must not be empty." }]}>
                    <Select mode='multiple' placeholder="从im/oa/sop/sos中选择">
                        <Select.Option value="im">im</Select.Option>
                        <Select.Option value="oa">oa</Select.Option>
                        <Select.Option value="sop">sop</Select.Option>
                        <Select.Option value="sos">sos</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item name="labels" label="Labels: " help=""
                    rules={[{ required: true, message: "Labels must not be empty." }]}>
                    <Select placeholder="从Android/iOS/FE/BE/QA中选择">
                        <Select.Option value="Android">Android</Select.Option>
                        <Select.Option value="iOS">iOS</Select.Option>
                        <Select.Option value="FE">FE</Select.Option>
                        <Select.Option value="BE">BE</Select.Option>
                        <Select.Option value="QA">QA</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item name="discription" label="Description: ">
                    <TextArea rows={10} />
                </Form.Item>

                {/* <Divider/> */}
                <Form.Item name="create" label='创建: '>
                    <Space size='small'>
                        <Button type="primary" htmlType='submit'>开始创建</Button>
                        <Button type="default" onClick={(e) => { showDrawer() }}>显示进展</Button>
                    </Space>
                </Form.Item>
            </Form>

            <Divider orientation="left"></Divider>
            <List
                header={<div>创建结果：</div>}
                footer={<div>点击可以跳转</div>}
                bordered
                dataSource={createdIssues}
                renderItem={(item) => (
                    <List.Item onClick={(value) => {
                        const { shell } = require('@electron/remote');
                        shell.openExternal(`https://jira.shopee.io/browse/${item.key}`);
                    }}>
                        {`[${item.fields.issuetype.name}] ${item.fields.summary} => https://jira.shopee.io/browse/${item.key}`}
                    </List.Item>
                )}
            />

            <Drawer
                title="Process"
                placement='right'
                closable={false}
                onClose={onDrawerClose}
                open={drawerOpen}
                key='right'>
                {drawerList()}
            </Drawer>
        </div>
    )
}

export default Jira