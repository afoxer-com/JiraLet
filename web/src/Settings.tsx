import {useState} from 'react'
import {Button, Divider, Form, Input, Space, Tooltip} from 'antd';
import {JIRA_DOMAIN, JIRA_TOKEN_KEY} from './Const'
import {saveJiraToken} from './jira-node-service';
import {QuestionCircleOutlined} from '@ant-design/icons';

const {ipcRenderer} = require('electron');

function Settings() {
    let storage = window.localStorage;
    let jiraTokenInStorage = storage.getItem(JIRA_TOKEN_KEY) ?? ""
    const [jiraToken, setJiraToken] = useState(jiraTokenInStorage)
    const [updateState, setUpdateState] = useState('none')
    const [updateTips, setUpdateTips] = useState('检查新版本')

    ipcRenderer.on('updater-event', (_, eventName, ...args) => {
        console.log({eventName, args});

        switch (eventName) {
            case'checking-for-update': {
                console.log(`checking for update `, ...args)
                setUpdateState(eventName)
                setUpdateTips(`正在检查新版本...`)
                break;
            }
            case 'update-available': {
                console.log(`update available `, ...args)
                setUpdateState(eventName)
                setUpdateTips(`有新版本，点击更新到 ${args[0].version}`)
                break;
            }
            case 'update-not-available': {
                console.log(`update-not-available`, ...args)
                setUpdateState(eventName)
                setUpdateTips(`没有发现最新版本`)
                break;
            }
            case 'update-downloading': {
                console.log(`update-downloading `, ...args)
                setUpdateState(eventName)
                setUpdateTips(`下载中...`)
                console.log(`update downloading..., `, ...args)
                break;
            }
            case 'update-downloaded': {
                console.log(`update-downloaded `, ...args)
                setUpdateState(eventName)
                setUpdateTips(`下载完成, 开始安装`)
                ipcRenderer.invoke('quitAndInstall');
                console.log(`update dowloaded, `, ...args)
                break;
            }
            case 'update-log': {
                console.log(`${args[1]}: ${args[2]}`);
                break
            }
            case 'error' : {
                setUpdateState(eventName)
                console.log(`error `, ...args)
                setUpdateState(eventName)
                setUpdateTips(`更新出现错误：${args[0]}`)
                break;
            }
            default: {
                break
            }
        }
    });

    const onFinish = (values: { jira_token: string | null | undefined }) => {
        saveJiraToken(values.jira_token ?? "")
        setJiraToken(values.jira_token ?? "")
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'left',
            justifyContent: 'left',
            flexDirection: 'column',
            height: '100vh'
        }}>
            <Form
                name="basic"
                labelCol={{span: 8}}
                wrapperCol={{span: 16}}
                initialValues={{remember: true}}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item
                    label="JIRA token"
                    name="jira_token"
                    rules={[{required: true, message: 'Please input your JIRA token!'}]}

                >
                    <Space size='small'>
                        <Input.Password defaultValue={jiraToken} style={{float: 'left'}}/>
                        <Tooltip title="How can I get personal token?" style={{float: 'left'}}>
                            <Button shape="circle" icon={<QuestionCircleOutlined/>} onClick={
                                (event) => {
                                    const {shell} = require('@electron/remote');
                                    shell.openExternal(`https://${JIRA_DOMAIN}/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens`);
                                }
                            }/>
                        </Tooltip>
                    </Space>
                </Form.Item>

                <Form.Item wrapperCol={{offset: 8, span: 16}}>
                    <Button type="primary" htmlType="submit">
                        Save
                    </Button>
                </Form.Item>
            </Form>
            <Divider/>
            <Button onClick={(e) => {
                if (updateState == 'none' || updateState == 'update-not-available' || updateState == 'error') {
                    ipcRenderer.invoke('checkForUpdates');
                } else if (updateState == 'update-available') {
                    ipcRenderer.invoke('downloadUpdate');
                }
            }}>{updateTips}</Button>
        </div>
    )
}

export default Settings
