import { useState } from 'react'
import React from 'react';
import Settings from './Settings';
import Jira from './Jira';
import { Layout, Menu } from 'antd';
const { Header, Content, Footer, Sider } = Layout;

import {
  CloudOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { jiraToken } from './jira-node-service';

const TAB_JIRA = "jira";
const TAB_SETTINGS = "settings";


function App() {
  let tab_value = jiraToken() == "" ? TAB_SETTINGS : TAB_JIRA;
  const [tab, setTab] = useState(tab_value)

  function onSidebarSelected(e: any) {
    console.log(`side bar clicked: ${e.key}`)
    // if (e.key == TAB_JIRA) {
    //   if (jiraToken() == "") {
    //     const { dialog } = require('@electron/remote');
    //     dialog.showMessageBox(null, {
    //       type: "info",
    //       message: "你还没有设置JIRA的Personal Token，无法访问JIRA",
    //     }, (response: number, checkboxChecked: boolean) => {

    //     });
    //     setTab(TAB_SETTINGS)
    //     return;
    //   }
    // }
    setTab(e.key)
  }

  return (
    <Layout>
      <Sider style={{
        overflow: 'auto',
        width:'20vh',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={[tab_value]} selectedKeys={[tab]} items={[
          {
            key: TAB_SETTINGS, icon: React.createElement(UserOutlined), label: '设置'
          },
          {
            key: TAB_JIRA, icon: React.createElement(CloudOutlined), label: 'JIRA建单助手'
          }
        ]} onSelect={onSidebarSelected} />
      </Sider>

      <Layout style={{ marginLeft: '22vh' }}>
        <Content style={{ margin: '20px 16px' }}>
          <div style={{
            display: tab == TAB_JIRA ? 'block' : 'none'
          }}>
            <Jira onJiraTokenEmpty={() => {
              console.log("onJiraTokenEmpty is called.")
              setTab(TAB_SETTINGS)
            }} />
          </div>
          <div style={{
            display: tab == TAB_SETTINGS ? 'block' : 'none'
          }}>
            <Settings />
          </div>
        </Content>
      </Layout>
    </Layout >
  )
}

export default App
