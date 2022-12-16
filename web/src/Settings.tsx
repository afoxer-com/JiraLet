import { useState } from 'react'
import { Button, Form, Input, Space, Tooltip } from 'antd';
import { JIRA_TOKEN_KEY } from './Const'
import { saveJiraToken } from './jira-node-service';
import { QuestionCircleOutlined } from '@ant-design/icons';

function Settings() {
    let storage = window.localStorage;
    let jiraTokenInStorage = storage.getItem(JIRA_TOKEN_KEY) ?? "";
    const [jiraToken, setJiraToken] = useState(jiraTokenInStorage);

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
            height: '100vh',
        }}>
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item
                    label="JIRA token"
                    name="jira_token"
                    rules={[{ required: true, message: 'Please input your JIRA token!' }]}

                >
                    <Space size='small'>
                        <Input.Password defaultValue={jiraToken} style={{ float: 'left' }} />
                        <Tooltip title="How can I get personal token?" style={{ float: 'left' }}>
                            <Button shape="circle" icon={<QuestionCircleOutlined />} onClick={
                                (event) => {
                                    const { shell } = require('@electron/remote');
                                    shell.openExternal(`https://jira.shopee.io/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens`);
                                }
                            } />
                        </Tooltip>
                    </Space>
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                    <Button type="primary" htmlType="submit">
                        Save
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

export default Settings
