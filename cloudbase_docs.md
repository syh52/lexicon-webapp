[跳到主要内容](https://docs.cloudbase.net/run/best-practice/fix-timezone#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 解决时区不一致问题

## 问题背景 [](https://docs.cloudbase.net/run/best-practice/fix-timezone#%E9%97%AE%E9%A2%98%E8%83%8C%E6%99%AF "问题背景的直接链接")

容器系统时间默认为 UTC 协调世界时间 （Universal Time Coordinated），与本地所属时区 CST （上海时间）相差 8 个小时。当需要获取系统时间用于日志记录、数据库存储等相关操作时，容器内时区不一致问题将会带来一系列困扰。

## 操作步骤 [](https://docs.cloudbase.net/run/best-practice/fix-timezone#%E6%93%8D%E4%BD%9C%E6%AD%A5%E9%AA%A4 "操作步骤的直接链接")

在构建基础镜像或在基础镜像的基础上制作自定义镜像时，在 Dockerfile 中创建时区文件即可解决单一容器内时区不一致问题，且后续使用该镜像时，将不再受时区问题困扰。

1. 打开 Dockerfile 文件。

2. 写入以下内容，配置时区文件。





````codeBlockLines_e6Vv
FROM centos
RUN rm -f /etc/localtime \
&& ln -sv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
&& echo "Asia/Shanghai" > /etc/timezone

````

3. 重新构建容器镜像，使用新的镜像重新部署。或直接上传含新的 Dockerfile 的代码包重新部署。


- [问题背景](https://docs.cloudbase.net/run/best-practice/fix-timezone#%E9%97%AE%E9%A2%98%E8%83%8C%E6%99%AF)
- [操作步骤](https://docs.cloudbase.net/run/best-practice/fix-timezone#%E6%93%8D%E4%BD%9C%E6%AD%A5%E9%AA%A4)

---
[跳到主要内容](https://docs.cloudbase.net/run/best-practice/function-callContainer#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 云函数中调用云托管

本文介绍如何在云函数中访问云托管中的服务。

## 步骤一：获取服务的内网域名 [](https://docs.cloudbase.net/run/best-practice/function-callContainer#%E6%AD%A5%E9%AA%A4%E4%B8%80%E8%8E%B7%E5%8F%96%E6%9C%8D%E5%8A%A1%E7%9A%84%E5%86%85%E7%BD%91%E5%9F%9F%E5%90%8D "步骤一：获取服务的内网域名的直接链接")

在“服务配置”选项卡中，获取服务对应的内网域名
![](https://main.qcloudimg.com/raw/437427cccb9bc97a35b83129b75102b6.png)

提示

1. 开发者需要自行校验请求来源的安全性。
2. 内网域名的请求不会产生公网流量费用。

## 步骤二：云函数中调用云托管 [](https://docs.cloudbase.net/run/best-practice/function-callContainer#%E6%AD%A5%E9%AA%A4%E4%BA%8C%E4%BA%91%E5%87%BD%E6%95%B0%E4%B8%AD%E8%B0%83%E7%94%A8%E4%BA%91%E6%89%98%E7%AE%A1 "步骤二：云函数中调用云托管的直接链接")

示例代码：

````codeBlockLines_e6Vv
const got = require("got"); // 需自行安装依赖

exports.main = async (event, context) => {
  // internal 域名
  const internalDomain = "yourEnvId-yourAppId.region.internal.tcloudbase.com";
  const requestContainerUrl = `http://${internalDomain}/yourServerPath`;

  const { body } = await got.get(requestContainerUrl);

  console.log("body", body);
  return {
    body
  };
};

````

- [步骤一：获取服务的内网域名](https://docs.cloudbase.net/run/best-practice/function-callContainer#%E6%AD%A5%E9%AA%A4%E4%B8%80%E8%8E%B7%E5%8F%96%E6%9C%8D%E5%8A%A1%E7%9A%84%E5%86%85%E7%BD%91%E5%9F%9F%E5%90%8D)
- [步骤二：云函数中调用云托管](https://docs.cloudbase.net/run/best-practice/function-callContainer#%E6%AD%A5%E9%AA%A4%E4%BA%8C%E4%BA%91%E5%87%BD%E6%95%B0%E4%B8%AD%E8%B0%83%E7%94%A8%E4%BA%91%E6%89%98%E7%AE%A1)

---
[跳到主要内容](https://docs.cloudbase.net/run/best-practice/migration#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 将您的服务迁移到云托管

大多数后台服务，通常包含以下组件：

- 服务本体
- 持久化服务（各类数据库、文件存储）
- 基础设施（如消息队列、服务注册发现中心、监控系统、日志系统等）

## 迁移服务本体 [](https://docs.cloudbase.net/run/best-practice/migration#%E8%BF%81%E7%A7%BB%E6%9C%8D%E5%8A%A1%E6%9C%AC%E4%BD%93 "迁移服务本体的直接链接")

CloudBase 云托管适用于部署 **无状态的容器化服务**，您需要将您的服务改造为此种类型。

### 无状态服务 [](https://docs.cloudbase.net/run/best-practice/migration#%E6%97%A0%E7%8A%B6%E6%80%81%E6%9C%8D%E5%8A%A1 "无状态服务的直接链接")

无状态服务即服务在处理单个请求时，不需要持久性地保存上下文，以保证服务可以做到任意 **横向扩容**。

无状态服务的每个服务节点之间是完全等价的，请求可能会由随机的任意节点进行处理，并且节点可能会被动态地销毁、重建、扩容，所以您 **不应该在节点上保存任何状态**，例如：

- 使用本地内存储存 HTTP Session；
- 使用本地文件储存数据；
- 业务逻辑中使用某个节点的 IP。

如果您有以上的需求，可以考虑如下解决方法：

- 使用 Redis 等外部数据库储存 HTTP Session；
- 使用 CFS、对象存储等外部服务保存文件；
- 使用服务对外 URL。

### 容器化 [](https://docs.cloudbase.net/run/best-practice/migration#%E5%AE%B9%E5%99%A8%E5%8C%96 "容器化的直接链接")

CloudBase 云托管只能部署基于 Docker 容器的应用，为了将服务封装到容器中，您应该使用 Dockerfile 来定义您的应用运行环境。

### 使用标准输出打印日志 [](https://docs.cloudbase.net/run/best-practice/migration#%E4%BD%BF%E7%94%A8%E6%A0%87%E5%87%86%E8%BE%93%E5%87%BA%E6%89%93%E5%8D%B0%E6%97%A5%E5%BF%97 "使用标准输出打印日志的直接链接")

CloudBase 云托管会自动收集您应用产生的标准输出，并提供服务日志查询功能。

## 迁移基础设施 [](https://docs.cloudbase.net/run/best-practice/migration#%E8%BF%81%E7%A7%BB%E5%9F%BA%E7%A1%80%E8%AE%BE%E6%96%BD "迁移基础设施的直接链接")

云托管应用可以通过其所在的 VPC 访问任意云上资源，如果您的基础设施已经部署在腾讯云内，则只需要打通 VPC 即可让您的服务访问您的基础设施。

- [迁移服务本体](https://docs.cloudbase.net/run/best-practice/migration#%E8%BF%81%E7%A7%BB%E6%9C%8D%E5%8A%A1%E6%9C%AC%E4%BD%93)
  - [无状态服务](https://docs.cloudbase.net/run/best-practice/migration#%E6%97%A0%E7%8A%B6%E6%80%81%E6%9C%8D%E5%8A%A1)
  - [容器化](https://docs.cloudbase.net/run/best-practice/migration#%E5%AE%B9%E5%99%A8%E5%8C%96)
  - [使用标准输出打印日志](https://docs.cloudbase.net/run/best-practice/migration#%E4%BD%BF%E7%94%A8%E6%A0%87%E5%87%86%E8%BE%93%E5%87%BA%E6%89%93%E5%8D%B0%E6%97%A5%E5%BF%97)
- [迁移基础设施](https://docs.cloudbase.net/run/best-practice/migration#%E8%BF%81%E7%A7%BB%E5%9F%BA%E7%A1%80%E8%AE%BE%E6%96%BD)

---
[跳到主要内容](https://docs.cloudbase.net/run/best-practice/spring-cloud#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 部署 Spring Cloud 服务

## 概述 [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E6%A6%82%E8%BF%B0 "概述的直接链接")

[Spring Cloud](https://spring.io/projects/spring-cloud) 是基于 Spring Boot 的一整套实现微服务的框架，提供了微服务开发所需的配置管理、服务发现、断路器、智能路由、微代理、控制总线、全局锁、决策竞选、分布式会话和集群状态管理等组件。

## 部署示例 [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%83%A8%E7%BD%B2%E7%A4%BA%E4%BE%8B "部署示例的直接链接")

在下面的例子中，我们将部署一套基于 Spring Cloud 的微服务，包含：

- 1 个服务提供者（ **hello-service**），使用 CloudBase 云托管部署；
- 1 个服务调用者（ **hello-client**），使用 CloudBase 云托管部署；
- 注册中心（ **eureka-server**）和配置中心（ **config-server**），使用腾讯云 CVM 部署

![](https://main.qcloudimg.com/raw/c0e1f659d2521c29863bfcb6a74efa44.png)

示例代码仓库： [https://github.com/TencentCloudBase/Cloudbase-Examples/tree/master/cloudbaserun/spring-cloud-docker-demo](https://github.com/TencentCloudBase/Cloudbase-Examples/tree/master/cloudbaserun/spring-cloud-docker-demo)

## 部署流程 [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%83%A8%E7%BD%B2%E6%B5%81%E7%A8%8B "部署流程的直接链接")

注意

以下所有涉及的 CVM 实例、云托管实例，都处于同一个 VPC 内。您可以在云托管详情内看到您的应用所属的 VPC。

## 第 1 步：部署注册中心（eureka-server） [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-1-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%B3%A8%E5%86%8C%E4%B8%AD%E5%BF%83eureka-server "第 1 步：部署注册中心（eureka-server）的直接链接")

首先需要您准备一个腾讯云 CVM 实例，如果您没有实例，可以前往腾讯云 CVM 购买。

注意

CVM 实例需要与云托管服务处于同一 VPC 内。您可以在购买 CVM 时指定，也可以修改已有的 CVM 实例所处的 VPC 网络。

下载 [项目示例代码](https://github.com/TencentCloudBase/Cloudbase-Examples/tree/master/cloudbaserun/spring-cloud-docker-demo)，进入 `eureka-server` 目录下，执行：

````codeBlockLines_e6Vv
mvn compile & mvn package

````

在 `target` 目录下，可以看到构建产物： `app.jar`。

使用任意方法将 `app.jar` 上传至您 CVM 内的 `/root` 目录下，这里我们使用 [scp](https://www.runoob.com/linux/linux-comm-scp.html) 命令：

````codeBlockLines_e6Vv
scp app.jar root@1.2.3.4:/root/

````

登录到 CVM 内，在 `/root` 目录下，运行：

````codeBlockLines_e6Vv
java -jar app.jar &

````

提示

此处需要您的 CVM 已经预先安装好了 Java，如果没有安装 Java，请参阅相关文档进行安装。

安装成功后，打开 CVM 对应公网的 IP 和端口（项目默认为 `8280`）可查看到如下的界面：

![](https://main.qcloudimg.com/raw/8dd203402c84ae0a43419edc177dbc9b.png)

## 第 2 步：部署配置中心（config-server） [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-2-%E6%AD%A5%E9%83%A8%E7%BD%B2%E9%85%8D%E7%BD%AE%E4%B8%AD%E5%BF%83config-server "第 2 步：部署配置中心（config-server）的直接链接")

首先需要您准备一个腾讯云 CVM 实例，如果您没有实例，可以前往腾讯云 CVM 购买。

注意

为了更接近真实的服务场景，我们建议您使用与上文的注册中心不同的 CVM 示例。

进入示例项目的 `config-server/src/main/resources` 目录，修改 `application.yml`，将 Eureka 的地址改为上文的 **注册中心（eureka-server）** 的地址，如下图：

![](https://main.qcloudimg.com/raw/95ad69f5382dc93fb796cddeb92f5abf.png)

进入 `config-server` 目录，执行：

````codeBlockLines_e6Vv
mvn compile & mvn package

````

在 `target` 目录下，可以看到构建产物： `app.jar`。

使用任意方法将 `app.jar` 上传至您 CVM 内的 `/root` 目录下，这里我们使用 [scp](https://www.runoob.com/linux/linux-comm-scp.html) 命令：

````codeBlockLines_e6Vv
scp app.jar root@1.2.3.4:/root/

````

登录到 CVM 内，在 `/root` 目录，运行：

````codeBlockLines_e6Vv
java -jar app.jar &

````

安装成功后，打开 CVM 对应公网的 IP 、端口（默认为 `8210`）、路径 `/config-client-dev.yml`（例如 [http://81.68.219.131:8210/config-client-dev.yml](http://81.68.219.131:8210/config-client-dev.yml) ）可查看到如下输出：

![](https://main.qcloudimg.com/raw/c7f1289760e74b6b3d6d9a865648d828.png)

## 第 3 步：部署服务提供方（hello-service） [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-3-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1%E6%8F%90%E4%BE%9B%E6%96%B9hello-service "第 3 步：部署服务提供方（hello-service）的直接链接")

首先 [开通云托管](https://docs.cloudbase.net/run/activation)，选择与上文 CVM 同样的 VPC，以及对应的子网:

![](https://main.qcloudimg.com/raw/1c806169425abc409786af835a33af03.png)

新建服务 `hello-service`：

![](https://main.qcloudimg.com/raw/432c74209219f377a5c13dbf44dac433.png)

进入示例项目 `hello-service/src/main/resources` 目录，修改 `application.yml`，将 Eureka 的地址改为对应地址，如下图：

![](https://main.qcloudimg.com/raw/8cb877698c7c77a7fccf36804dede364.png)

然后登录 CloudBase 云托管控制台，选择新建版本，将示例项目的 `/hello-service` 目录上传，同时版本配置参考如下：

![](https://main.qcloudimg.com/raw/bfd406578dd8aa7874a766bf0616630b.png)

部署成功后，会在云开发控制台看到版本状态为「正常」：

![](https://main.qcloudimg.com/raw/c1eaf2ecef7c9d059fd534349bbbe0ac.png)

并且在 Eureka 控制台，可以看到有新的注册节点：

![](https://main.qcloudimg.com/raw/971a7de259d940ae85bdf5c4579719c6.png)

## 第 4 步：部署服务调用方（hello-client） [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1%E8%B0%83%E7%94%A8%E6%96%B9hello-client "第 4 步：部署服务调用方（hello-client）的直接链接")

新建服务 `hello-client`：

![](https://main.qcloudimg.com/raw/f6c9694f9aca40e038d387ae6653a2d7.png)

进入示例项目 `hello-client/src/main/resources` 目录，修改 `application.yml`，将 Eureka 的地址改为对应地址，如下图：

![](https://main.qcloudimg.com/raw/0831b976cb9a2eb3fc6e8feadf7c8270.png)

然后登录 CloudBase 云托管控制台，选择新建版本，将示例项目的 `/hello-client` 目录上传，同时版本配置参考如下：

![](https://main.qcloudimg.com/raw/3c08d7b04f6cc9ef82fef4273bf4107c.png)

部署成功后，会在云开发控制台看到版本状态为「正常」：

![](https://main.qcloudimg.com/raw/fbaf54c3e056714fb2a7fe44c679a8a3.png)

并且在 Eureka 控制台，可以看到有新的注册节点：

![](https://main.qcloudimg.com/raw/bb3abd669b8c15e576067b49f576ed46.png)

## 验证服务 [](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%AA%8C%E8%AF%81%E6%9C%8D%E5%8A%A1 "验证服务的直接链接")

访问 `hello-client` 的 HTTP 地址，可以看到如下输出：

![](https://main.qcloudimg.com/raw/f8e9882379c25e8089cd25e3dd52a7be.png)

- [概述](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E6%A6%82%E8%BF%B0)
- [部署示例](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%83%A8%E7%BD%B2%E7%A4%BA%E4%BE%8B)
- [部署流程](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%83%A8%E7%BD%B2%E6%B5%81%E7%A8%8B)
- [第 1 步：部署注册中心（eureka-server）](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-1-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%B3%A8%E5%86%8C%E4%B8%AD%E5%BF%83eureka-server)
- [第 2 步：部署配置中心（config-server）](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-2-%E6%AD%A5%E9%83%A8%E7%BD%B2%E9%85%8D%E7%BD%AE%E4%B8%AD%E5%BF%83config-server)
- [第 3 步：部署服务提供方（hello-service）](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-3-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1%E6%8F%90%E4%BE%9B%E6%96%B9hello-service)
- [第 4 步：部署服务调用方（hello-client）](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1%E8%B0%83%E7%94%A8%E6%96%B9hello-client)
- [验证服务](https://docs.cloudbase.net/run/best-practice/spring-cloud#%E9%AA%8C%E8%AF%81%E6%9C%8D%E5%8A%A1)

---
[跳到主要内容](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 访问 CloudBase 云数据库

## 方法一：使用 Open API 访问 CloudBase [](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E6%96%B9%E6%B3%95%E4%B8%80%E4%BD%BF%E7%94%A8-open-api-%E8%AE%BF%E9%97%AE-cloudbase "方法一：使用 Open API 访问 CloudBase的直接链接")

Cloudbase Open API 让开发者可以通过 HTTP 的方式，以管理员身份调用 CloudBase 的各项服务。

以云托管中的 Node.js 服务为例：

````codeBlockLines_e6Vv
const express = require("express");
const got = require("got");
const app = express();

app.get("/", async (req, res) => {
  // 从请求头中获取凭证信息
  const authorization = req.headers["x-cloudbase-authorization"];
  const sessiontoken = req.headers["x-cloudbase-sessiontoken"];
  const timestamp = req.headers["x-cloudbase-timestamp"];

  // 使用凭证向 CloudBase Open API 发起请求
  // 以查询文档为例，先拼接url
  const envId = "foo";
  const collectionName = "bar";
  const docId = "123";
  const url = `https://tcb-api.tencentcloudapi.com/api/v2/envs/${envId}/databases/${collectionName}/documents/${docId}`;

  // 发起请求，请求头中加入凭证信息
  const response = await got(url, {
    headers: {
      "X-CloudBase-Authorization": authorization,
      "X-CloudBase-TimeStamp": timestamp,
      "X-CloudBase-SessionToken": sessiontoken
    }
  });

  res.send(response.body);
});

app.listen(3000);

````

详情请参阅： [Open API 文档](https://docs.cloudbase.net/api-reference/openapi/introduction)

## 方法二：使用 CloudBase 服务端 SDK [](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E6%96%B9%E6%B3%95%E4%BA%8C%E4%BD%BF%E7%94%A8-cloudbase-%E6%9C%8D%E5%8A%A1%E7%AB%AF-sdk "方法二：使用 CloudBase 服务端 SDK的直接链接")

例如，您可以在 Node.js 中，使用 [CloudBase Node.js SDK](https://docs.cloudbase.net/api-reference/server/node-sdk/introduction) 调用 CloudBase 服务。

````codeBlockLines_e6Vv
const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init({
  env: "xxx"
});

const db = app.database();

db.collection("todos")
  .get()
  .then((result) => {
    console.log(result);
  });

````

提示

CloudBase 服务端 SDK 已经与云托管进行集成，无需手工填入密钥即可使用。

## 参考文档 [](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E5%8F%82%E8%80%83%E6%96%87%E6%A1%A3 "参考文档的直接链接")

更多信息请参见 [Node.js SDK](https://docs.cloudbase.net/api-reference/server/node-sdk/introduction) 文档。

- [方法一：使用 Open API 访问 CloudBase](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E6%96%B9%E6%B3%95%E4%B8%80%E4%BD%BF%E7%94%A8-open-api-%E8%AE%BF%E9%97%AE-cloudbase)
- [方法二：使用 CloudBase 服务端 SDK](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E6%96%B9%E6%B3%95%E4%BA%8C%E4%BD%BF%E7%94%A8-cloudbase-%E6%9C%8D%E5%8A%A1%E7%AB%AF-sdk)
- [参考文档](https://docs.cloudbase.net/run/best-practice/using-cloudbase-database#%E5%8F%82%E8%80%83%E6%96%87%E6%A1%A3)

---
[跳到主要内容](https://docs.cloudbase.net/run/best-practice/using-mysql#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 访问云上 MySQL 数据库

云托管服务可以通过其所在的 VPC（私有网络）访问您在腾讯云上的 MySQL 数据库。

## 背景知识 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E8%83%8C%E6%99%AF%E7%9F%A5%E8%AF%86 "背景知识的直接链接")

关于使用 VPC 连接 MySQL，请参阅 [连接 MySQL 实例](https://cloud.tencent.com/document/product/236/3130)。
点击服务所在私有网络的名称，可以跳转到私有网络控制台查看该私有网络内您有哪些MySQL数据库资源，可以与此服务配合使用。

## 前置条件 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E5%89%8D%E7%BD%AE%E6%9D%A1%E4%BB%B6 "前置条件的直接链接")

您的云托管服务和 MySQL 数据库处于同一 VPC 内。

## 操作步骤 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E6%93%8D%E4%BD%9C%E6%AD%A5%E9%AA%A4 "操作步骤的直接链接")

### 第 1 步：查询 MySQL 实例所在 VPC [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-1-%E6%AD%A5%E6%9F%A5%E8%AF%A2-mysql-%E5%AE%9E%E4%BE%8B%E6%89%80%E5%9C%A8-vpc "第 1 步：查询 MySQL 实例所在 VPC的直接链接")

1. 登录 [云数据库 MySQL 控制台](https://console.cloud.tencent.com/cdb)，找到您的 MySQL 实例；
2. 在左侧菜单中，单击「实例列表」，进入实例列表。单击实例名进入详情页，进入「实例详情」选项卡，在基本信息版块中，查找到 **所属网络** 信息：
![](https://main.qcloudimg.com/raw/587ff2bf466ce705cd1b559d36d48cf8.jpg)

### 第 2 步：新建云托管服务 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-2-%E6%AD%A5%E6%96%B0%E5%BB%BA%E4%BA%91%E6%89%98%E7%AE%A1%E6%9C%8D%E5%8A%A1 "第 2 步：新建云托管服务的直接链接")

具体流程请参阅： [新建服务](https://docs.cloudbase.net/run/deploy/create-service)。
创建时，在“云托管网络”中选择「已有私有网络」，下拉选择步骤 1 中查询到 MySQL 实例所在的 VPC 和子网。

### 第 3 步：部署服务 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-3-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1 "第 3 步：部署服务的直接链接")

具体流程请参阅 [部署服务](https://docs.cloudbase.net/run/deploy/deploy-service)。
服务部署完成后，该服务将可以访问您选定的 MySQL 实例，以及同 VPC 下其他 MySQL 实例。

## 说明 [](https://docs.cloudbase.net/run/best-practice/using-mysql#%E8%AF%B4%E6%98%8E "说明的直接链接")

- 已有云托管服务不支持修改所在VPC。若您已部署好了服务，误选了和 MySQL 实例不相同的 VPC，可选择：
1. 重新在正确VPC部署服务，删除部署错误的服务；或
2. [打通多个 VPC](https://cloud.tencent.com/document/product/215/36698)。
- 云托管暂时仅支持上海、广州、北京地域。若您的 MySQL 实例不在上述地域则无法复用。更多地域将陆续开放，敬请期待。

- [背景知识](https://docs.cloudbase.net/run/best-practice/using-mysql#%E8%83%8C%E6%99%AF%E7%9F%A5%E8%AF%86)
- [前置条件](https://docs.cloudbase.net/run/best-practice/using-mysql#%E5%89%8D%E7%BD%AE%E6%9D%A1%E4%BB%B6)
- [操作步骤](https://docs.cloudbase.net/run/best-practice/using-mysql#%E6%93%8D%E4%BD%9C%E6%AD%A5%E9%AA%A4)
  - [第 1 步：查询 MySQL 实例所在 VPC](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-1-%E6%AD%A5%E6%9F%A5%E8%AF%A2-mysql-%E5%AE%9E%E4%BE%8B%E6%89%80%E5%9C%A8-vpc)
  - [第 2 步：新建云托管服务](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-2-%E6%AD%A5%E6%96%B0%E5%BB%BA%E4%BA%91%E6%89%98%E7%AE%A1%E6%9C%8D%E5%8A%A1)
  - [第 3 步：部署服务](https://docs.cloudbase.net/run/best-practice/using-mysql#%E7%AC%AC-3-%E6%AD%A5%E9%83%A8%E7%BD%B2%E6%9C%8D%E5%8A%A1)
- [说明](https://docs.cloudbase.net/run/best-practice/using-mysql#%E8%AF%B4%E6%98%8E)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/authenticating/end-users#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 对用户进行身份校验

默认云托管不提供鉴权服务，如果客户没有实现鉴权功能，则在某些情况下存在安全问题。如果您的服务要处理来自客户的请求，则最佳实践是只让允许的用户进行访问。

您可以通过 [自定义域名](https://docs.cloudbase.net/run/deploy/networking/custom-domains) 功能，并根据要求配置相关 path, 同时为 path 开启 `鉴权` 功能，来设置云托管服务的访问权限。

## 用户创建 [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E7%94%A8%E6%88%B7%E5%88%9B%E5%BB%BA "用户创建的直接链接")

- 1、登录腾讯云托管
- 2、在导航菜单 `扩展能力` 中选择 [云后台](https://tcb.cloud.tencent.com/dev?envId=lowcode-9gms1m53798f7294#/cloud-admin), 点击前往云后台
- 3、在云后台中选择 `用户管理` 添加用户, 设置用户高名称和密码

## 用户权限配置 [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E7%94%A8%E6%88%B7%E6%9D%83%E9%99%90%E9%85%8D%E7%BD%AE "用户权限配置的直接链接")

云托管服务默认只能以下几种角色客户访问:

- 默认内部用户
- 默认外部用户
- 自定义策略访问

注意: 其中在 `用户创建` 步骤创建的客户为 `默认内部用户`。

如果不想某些用户访问，可以给客户解绑 `默认内部用户` 和 `默认外部用户` 角色

### 自定义策略 [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%AD%96%E7%95%A5 "自定义策略的直接链接")

- 1、登录腾讯云托管
- 2、在导航菜单 `扩展能力` 中选择 [云后台](https://tcb.cloud.tencent.com/dev?envId=lowcode-9gms1m53798f7294#/cloud-admin), 点击前往云后台
- 3、在云后台中选择 `权限控制`, 在权限控制页面选择 `策略管理`, 如果没有该选项，可以刷新页面。
- 4、点击 `新增自定义策略`，填写表单:
  - 策略标识: 英文填写
  - 策略名称: 中英文填写
  - 策略内容: 我们以允许 `/api` 访问为例, 如下在 action 配置 `/api` 路径即可。




    ````codeBlockLines_e6Vv
    {
      "statement": [\
      {\
        "action": "cloudrun:/api",\
        "resource": "*",\
        "effect": "allow"\
      }\
    ],
    "version": "1.0"
    }

    ````
- 5、配置完自定义策略之后，将改策略关联到需要访问该资源的角色上，然后将该角色中关联需要访问的用户即可。

## 获取用户 Token [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7-token "获取用户 Token的直接链接")

参考 [用户名密码登录](https://docs.cloudbase.net/http-api/auth/auth-sign-in) OpenAPI 获取用户登录 token。

## 通过自定义域名访问云托管 [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E9%80%9A%E8%BF%87%E8%87%AA%E5%AE%9A%E4%B9%89%E5%9F%9F%E5%90%8D%E8%AE%BF%E9%97%AE%E4%BA%91%E6%89%98%E7%AE%A1 "通过自定义域名访问云托管的直接链接")

我们以设置路由为 `/api` 开头的服务为例。

参考 [自定义域名](https://docs.cloudbase.net/run/deploy/networking/custom-domains) 功能，在域名关联资源时， `鉴权开关` 选择打开, 路径透穿根据实际情况填写，比如我们 api 路径为 `/api`, 我们不开启路径透传的情况下，我们使用 `/api/users` 访问，后端服务收到的 url 为 `/users`， 反之开启情况下收到的为 `/api/users`。

我们配置完成之后，通过以下方式访问:

````codeBlockLines_e6Vv
curl -H "Content-Type: application/json" -H "Authorization: Bearer <获取到的Token>" https://<自定义域名>/api/users

````

即可获取到访问结果。

## 通过其他登录方式获取 Token [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E9%80%9A%E8%BF%87%E5%85%B6%E4%BB%96%E7%99%BB%E5%BD%95%E6%96%B9%E5%BC%8F%E8%8E%B7%E5%8F%96-token "通过其他登录方式获取 Token的直接链接")

可以参考 [用户登录设置](https://docs.cloudbase.net/http-api/auth/%E7%99%BB%E5%BD%95%E8%AE%A4%E8%AF%81%E6%8E%A5%E5%8F%A3)。

## 获取用户信息 [](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7%E4%BF%A1%E6%81%AF "获取用户信息的直接链接")

我们会将客户的 token 透穿给后端，后端可以通过获取请求 Header 中 `Authorization` 字段获取到请求 Token, 注意去除 Bearer 字段。

然后通过 jwt 解码 token, 解码后 `user_id` 字段为用户的唯一标识。解析后 payload 内容如下:

````codeBlockLines_e6Vv
{
    "iss": "",
    "sub": "22332323",
    "aud": "",
    "exp": 1750073415,
    "iat": 1750066215,
    "at_hash": "",
    "scope": "",
    "project_id": "",
    "provider_type": "username",
    "meta": {
        "wxOpenId": "",
        "wxUnionId": ""
    },
    "user_id": "1934543672625225729",
    "user_type": "internal"
}

````

如需查询客户详细信息，请参考 [用户详情](https://docs.cloudbase.net/lowcode/manage/auth#%E7%94%A8%E6%88%B7%E8%AF%A6%E6%83%85)。

- [用户创建](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E7%94%A8%E6%88%B7%E5%88%9B%E5%BB%BA)
- [用户权限配置](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E7%94%A8%E6%88%B7%E6%9D%83%E9%99%90%E9%85%8D%E7%BD%AE)
  - [自定义策略](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%AD%96%E7%95%A5)
- [获取用户 Token](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7-token)
- [通过自定义域名访问云托管](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E9%80%9A%E8%BF%87%E8%87%AA%E5%AE%9A%E4%B9%89%E5%9F%9F%E5%90%8D%E8%AE%BF%E9%97%AE%E4%BA%91%E6%89%98%E7%AE%A1)
- [通过其他登录方式获取 Token](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E9%80%9A%E8%BF%87%E5%85%B6%E4%BB%96%E7%99%BB%E5%BD%95%E6%96%B9%E5%BC%8F%E8%8E%B7%E5%8F%96-token)
- [获取用户信息](https://docs.cloudbase.net/run/deploy/authenticating/end-users#%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7%E4%BF%A1%E6%81%AF)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/authenticating/public#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

# 允许公开访问

默认情况下，云托管服务为公开访问(即不需要任何的权限验证)，任何用户都可以通过访问域名来访问服务。

如果您希望只有部分用户可以访问云托管服务，可以参考 [对用户开启身份认证](https://docs.cloudbase.net/run/deploy/authenticating/end-users)。

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

# 总览

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 运行模式

本页面介绍了云托管的运行模式。目前有以下几种:

- [始终自动扩缩容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E5%A7%8B%E7%BB%88%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9)
- [持续运行](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C)
- [白天持续运行,夜间自动扩缩容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E7%99%BD%E5%A4%A9%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C,%E5%A4%9C%E9%97%B4%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9)
- [自定义](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E8%87%AA%E5%AE%9A%E4%B9%89)

### 始终自动扩缩容 [](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E5%A7%8B%E7%BB%88%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9 "始终自动扩缩容的直接链接")

默认情况下，我们为云托管服务设置的运行模式为 `始终自动扩缩容`。每个云托管服务会根据 CPU 的使用情况增减实例个数，实例个数最大为 16, 最下为 0。

当然你也可以设置根据内存上限进行扩缩容，只需要在 `运行模式` -> `扩缩容条件` 配置 `内存` 指标即可。

### 持续运行 [](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C "持续运行的直接链接")

以下场景你可能需要服务持续运行，而不需要自动进行伸缩:

- 服务流量相对稳定，不会出现突然的流量增加或者减少

那么你可以将你的运行模式修改为持续运行，服务持续运行会根据你配置的实例个数持续运行，不会根据流量大小自动扩充或者减少实例格式。

### 白天持续运行,夜间自动扩缩容 [](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E7%99%BD%E5%A4%A9%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C,%E5%A4%9C%E9%97%B4%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9 "白天持续运行,夜间自动扩缩容的直接链接")

默认保持 8 点到 24 点运行实例，0 点到 8 点停止实例运行。

### 自定义 [](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E8%87%AA%E5%AE%9A%E4%B9%89 "自定义的直接链接")

当你需要在固定时间段运行或这减少实例时，可以使用该选项。

- [始终自动扩缩容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E5%A7%8B%E7%BB%88%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9)
- [持续运行](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C)
- [白天持续运行,夜间自动扩缩容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E7%99%BD%E5%A4%A9%E6%8C%81%E7%BB%AD%E8%BF%90%E8%A1%8C%E5%A4%9C%E9%97%B4%E8%87%AA%E5%8A%A8%E6%89%A9%E7%BC%A9%E5%AE%B9)
- [自定义](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/about-instance-autoscaling#%E8%87%AA%E5%AE%9A%E4%B9%89)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/manual-scaling#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

# 手动扩缩容

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/autoscaling/min-instances#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

# 关于实例下限

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/environment/containers#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 容器端口和入口点

本页面介绍如何为云托管服务配置容器端口、入口点命令和参数。

当腾讯云托管启动容器时，它会运行映像的默认入口点命令和默认命令参数。

## 配置容器端口 [](https://docs.cloudbase.net/run/deploy/configuring/environment/containers#%E9%85%8D%E7%BD%AE%E5%AE%B9%E5%99%A8%E7%AB%AF%E5%8F%A3 "配置容器端口的直接链接")

任何配置更改都会创建新的版本。后续版本也将自动采用该配置。

您可以在创建服务时，在 `容器配置` -> `端口` 指定您的服务端口。注意，该端口必须和您的服务实际访问端口保持一致，否则会导致云托管服务启动失败。

您也可以在服务创建后，在 `服务配置` 中修改您的服务端口。

- [配置容器端口](https://docs.cloudbase.net/run/deploy/configuring/environment/containers#%E9%85%8D%E7%BD%AE%E5%AE%B9%E5%99%A8%E7%AB%AF%E5%8F%A3)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 环境变量

本页介绍了如何为云托管服务配置环境变量。

## 设置环境变量 [](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E8%AE%BE%E7%BD%AE%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F "设置环境变量的直接链接")

您可以为新服务和现有服务设置环境变量。环境变量会绑定到特定的服务版本中，并且对云托管中的其他服务不可见。

您可以在创建新服务或新建服务后在 `服务设置` 中修改环境变量。

## 在容器中设置默认环境变量 [](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E5%9C%A8%E5%AE%B9%E5%99%A8%E4%B8%AD%E8%AE%BE%E7%BD%AE%E9%BB%98%E8%AE%A4%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F "在容器中设置默认环境变量的直接链接")

您可以使用 Dockerfile 中的 ENV 语句设置环境变量的默认值：

````codeBlockLines_e6Vv
ENV KEY1=VALUE1,KEY2=VALUE2

````

## 优先顺序 [](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E4%BC%98%E5%85%88%E9%A1%BA%E5%BA%8F "优先顺序的直接链接")

如果您在容器中设置默认环境变量，并在云托管服务上设置具有相同名称的环境变量，则该服务中设置的值优先。

- [设置环境变量](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E8%AE%BE%E7%BD%AE%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)
- [在容器中设置默认环境变量](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E5%9C%A8%E5%AE%B9%E5%99%A8%E4%B8%AD%E8%AE%BE%E7%BD%AE%E9%BB%98%E8%AE%A4%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)
- [优先顺序](https://docs.cloudbase.net/run/deploy/configuring/environment/envs#%E4%BC%98%E5%85%88%E9%A1%BA%E5%BA%8F)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# CPU 配置

本页介绍如何指定每个云托管实例所使用的 CPU 数量。默认情况下，系统会将云托管容器实例限制为 1 个 CPU。您可以按照本页中的说明增加或减少此值。

## 设置和更新 CPU 设置 [](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E8%AE%BE%E7%BD%AE%E5%92%8C%E6%9B%B4%E6%96%B0-cpu-%E8%AE%BE%E7%BD%AE "设置和更新 CPU 设置的直接链接")

默认情况下，系统会将每个实例限制为 1 个 CPU。您可以将此值更改为本页面中所述的其他值。

### CPU 和 内存 [](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#cpu-%E5%92%8C-%E5%86%85%E5%AD%98 "CPU 和 内存的直接链接")

以下是 CPU 的最低内存要求:

| CPU | 最小内存 |
| --- | --- |
| 1 | 2GiB |
| 2 | 4GiB |
| 3 | 6GiB |

或者如果您想使用的 CPU 少于 1, 则可以选择 0.08 到 1 之间的任何值，以 0.01 为增量。大于 1 的值必须是整数值。如果您使用的 CPU 少于 1 个，则必须符合以下要求：

- 一般建议 CPU 和 内存的比例关系为 1:2, 即 1 个 CPU 需要 2GiB 内存
- 如需设置大于 512MiB 的内存限制，至少需要 0.5 个 CPU
- 如需设置大于 1GiB 的内存限制，至少需要 1 个 CPU
- 默认最小 CPU 设置为 0.25
- 默认最大 CPU 设置为 16

## 配置 CPU 限制 [](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E9%85%8D%E7%BD%AE-cpu-%E9%99%90%E5%88%B6 "配置 CPU 限制的直接链接")

任何配置更改都会导致新版本的创建。后续的版本也将采用此配置。

你可以在创建服务后，在 `服务设置` 中 `代码配置` 选项中修改 CPU 配置。

## 查看 CPU 配置 [](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E6%9F%A5%E7%9C%8B-cpu-%E9%85%8D%E7%BD%AE "查看 CPU 配置的直接链接")

你可以在创建服务后，在 `服务设置` 中 `代码配置` 部分查看当前的 CPU 配置。

- [设置和更新 CPU 设置](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E8%AE%BE%E7%BD%AE%E5%92%8C%E6%9B%B4%E6%96%B0-cpu-%E8%AE%BE%E7%BD%AE)
  - [CPU 和 内存](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#cpu-%E5%92%8C-%E5%86%85%E5%AD%98)
- [配置 CPU 限制](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E9%85%8D%E7%BD%AE-cpu-%E9%99%90%E5%88%B6)
- [查看 CPU 配置](https://docs.cloudbase.net/run/deploy/configuring/resources/cpu-limits#%E6%9F%A5%E7%9C%8B-cpu-%E9%85%8D%E7%BD%AE)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 内存配置

本页介绍了如何指定可供服务使用的内存量。

## 了解内存用量 [](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E4%BA%86%E8%A7%A3%E5%86%85%E5%AD%98%E7%94%A8%E9%87%8F "了解内存用量的直接链接")

如果云托管实例超出其允许的内存限制，则该应用会被终止。

以下各项会计入实例的内存:

- 运行服务的可执行文件，因为可执行文件必须加载到内存中
- 在服务进程中分配内存
- 将文件写入文件系统

部署的容器的镜像大小不会计入到内存中。

## 设置和更新内存限制 [](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E8%AE%BE%E7%BD%AE%E5%92%8C%E6%9B%B4%E6%96%B0%E5%86%85%E5%AD%98%E9%99%90%E5%88%B6 "设置和更新内存限制的直接链接")

您可以为云托管服务设置内存限制。默认情况下，系统会为实例分配 2GiB 的内存。

## 配置内存限制 [](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E9%85%8D%E7%BD%AE%E5%86%85%E5%AD%98%E9%99%90%E5%88%B6 "配置内存限制的直接链接")

任何的配置修改都会导致新的版本创建。后续版本也将自动采用该配置。

对云云托管服务，您可以在创建服务之后，在 `服务设置` 中 `代码配置` 部分查看和修改内存配置。

- [了解内存用量](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E4%BA%86%E8%A7%A3%E5%86%85%E5%AD%98%E7%94%A8%E9%87%8F)
- [设置和更新内存限制](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E8%AE%BE%E7%BD%AE%E5%92%8C%E6%9B%B4%E6%96%B0%E5%86%85%E5%AD%98%E9%99%90%E5%88%B6)
- [配置内存限制](https://docs.cloudbase.net/run/deploy/configuring/resources/memory-limits#%E9%85%8D%E7%BD%AE%E5%86%85%E5%AD%98%E9%99%90%E5%88%B6)

---
[跳到主要内容](https://docs.cloudbase.net/run/deploy/service-manage#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# 服务管理

## 服务创建 [](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E5%88%9B%E5%BB%BA "服务创建的直接链接")

登录 [云开发平台](https://tcb.cloud.tencent.com/dev)，切换到指定的环境，选择「云托管」服务。如果未开通服务，可以选择开通。

在云托管服务页面选择【创建服务】。

在创建服务时可以选择多种方式进行服务部署：

- 通过模版：通过已有模版快速创建服务
- 通过容器镜像：利用可访问到的容器镜像进行服务部署
- 通过代码包：通过提交本地代码，部署服务

更多的详细部署介绍，可见 [服务部署说明](https://docs.cloudbase.net/run/deploy/deploy-service)

填写相关信息，并点击「创建」，即可开始服务部署。云托管将会创建服务以及创建版本，并开始部署具体版本。

部署成功后可以进入服务界面，查看服务状态。

## 服务删除 [](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E5%88%A0%E9%99%A4 "服务删除的直接链接")

登录 [云开发平台](https://tcb.cloud.tencent.com/dev)，切换到指定的环境，选择「云托管」服务。

在云托管服务的列表页面选择需要删除的服务，点击操作中的删除按钮，进行删除确认；进行确认后即可删除服务。

或者也可以进行需要删除的服务详情页，选择服务设置中的服务删除，同样进行删除确认；确认后即可删除服务。

## 服务更新 [](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E6%9B%B4%E6%96%B0 "服务更新的直接链接")

登录 [云开发平台](https://tcb.cloud.tencent.com/dev)，切换到指定的环境，选择「云托管」服务。

在云托管服务的列表页面选择需要更新的服务，进入详情页。

在详情页内可以选择更新服务，以创建新版本。更新服务时也可以通过多种部署方式进行：

- 通过容器镜像：利用可访问到的容器镜像进行服务部署
- 通过代码包：通过提交本地代码，部署服务

更多的详细部署介绍，可见 [服务部署说明](https://docs.cloudbase.net/run/deploy/deploy-service)

点击创建后，将会创建当前服务的新版本，并进行新版本的部署。

在新版本成功部署后，服务流量将切换到新版本上，可以通过服务的概览页查看当前流量情况。也可以通过部署记录，查询版本的历史部署情况。

- [服务创建](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E5%88%9B%E5%BB%BA)
- [服务删除](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E5%88%A0%E9%99%A4)
- [服务更新](https://docs.cloudbase.net/run/deploy/service-manage#%E6%9C%8D%E5%8A%A1%E6%9B%B4%E6%96%B0)

---
[跳到主要内容](https://docs.cloudbase.net/run/develop/languages-frameworks/django#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# Django

[Django](https://www.djangoproject.com/) 是一个功能强大的 Python Web 框架，遵循 "Batteries-included" 理念，提供开箱即用的全栈解决方案。它以高效开发和安全稳定著称，内置 ORM、Admin 后台、用户认证等模块，大幅减少重复代码。Django 采用清晰的 MVC（MTV）架构，支持高扩展性，适合从快速原型到企业级应用开发，其自动化的管理界面和详尽的文档进一步提升了开发效率。

本指南介绍如何通过多种方式在腾讯 [云托管](https://tcb.cloud.tencent.com/dev#/platform-run) 上部署 [示例 Django 应用程序](https://github.com/TencentCloudBase/tcbr-templates/tree/main/cloudrun-django):

## 创建一个 Django 应用 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E5%88%9B%E5%BB%BA%E4%B8%80%E4%B8%AA-django-%E5%BA%94%E7%94%A8 "创建一个 Django 应用的直接链接")

Note: 如果你已经存在一个 Django 应用，你可以跳过该步骤。

要创建新的 Django 应用程序，请确保你的机器上安装了 [Python](https://www.python.org/downloads/) 和 Django。

按照以下步骤在目录中设置项目。

创建虚拟环境

````codeBlockLines_e6Vv
python -m venv env

````

激活虚拟环境

````codeBlockLines_e6Vv
source env/bin/activate

````

安装 Django

````codeBlockLines_e6Vv
python -m pip install django

````

一切设置完成后，在终端运行以下命令来配置新的 Django 项目:

````codeBlockLines_e6Vv
django-admin startproject cloudrun-django

````

此命令将创建一个名为 `cloudrun-django` 的新项目。

接下来， `cd` 进入目录并运行 `python manage.py runserver` 以启动项目。

打开浏览器并查看 `http://127.0.0.1:8000`, 您将看到 Django 欢迎页面。

### 配置依赖项 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%85%8D%E7%BD%AE%E4%BE%9D%E8%B5%96%E9%A1%B9 "配置依赖项的直接链接")

创建 `requirements.txt` 文件:
要跟踪部署的所有依赖项，请创建一个 `requirements.txt` 文件:

````codeBlockLines_e6Vv
pip freeze > requirements.txt

````

Note: 只有在虚拟环境中运行上述命令才是安全的，否则它将生成系统上所有安装的 python 包。可能导致云托管上无法启动该应用程序。

## 配置 Dockerfile [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%85%8D%E7%BD%AE-dockerfile "配置 Dockerfile的直接链接")

在 Django 应用程序的跟目录中创建一个 `Dockerfile` 文件, 内容如下:

````codeBlockLines_e6Vv
FROM alpine:3.21.3

# 容器默认时区为UTC，如需使用上海时间请启用以下时区设置命令
RUN apk add tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone

# 选用国内镜像源以提高下载速度
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories \
&& apk add --update --no-cache python3 py3-pip gcc python3-dev linux-headers musl-dev \
&& rm -rf /var/cache/apk/*

# 使用 HTTPS 协议访问容器云调用证书安装
RUN apk add ca-certificates

# 拷贝当前项目到/app目录下(.dockerignore中文件除外)
COPY . /app

# 设定当前的工作目录
WORKDIR /app

# 安装依赖到指定的/install文件夹
# 选用国内镜像源以提高下载速度
RUN pip config set global.index-url http://mirrors.cloud.tencent.com/pypi/simple \
&& pip config set global.trusted-host mirrors.cloud.tencent.com \
&& pip install --upgrade pip --break-system-packages \
# pip install scipy 等数学包失败，可使用 apk add py3-scipy 进行， 参考安装 https://pkgs.alpinelinux.org/packages?name=py3-scipy&branch=v3.13
&& pip install --user -r requirements.txt --break-system-packages

# 执行启动命令
# 写多行独立的CMD命令是错误写法！只有最后一行CMD命令会被执行，之前的都会被忽略，导致业务报错。
# 请参考[Docker官方文档之CMD命令](https://docs.docker.com/engine/reference/builder/#cmd)
CMD ["python3", "manage.py", "runserver","0.0.0.0:8080"]

````

通过上面更改，你的 Django 程序将可以部署到腾讯云托管了!

## 部署到云托管 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%83%A8%E7%BD%B2%E5%88%B0%E4%BA%91%E6%89%98%E7%AE%A1 "部署到云托管的直接链接")

云托管提供了多种部署方式来部署你的应用：

### [控制台部署](https://tcb.cloud.tencent.com/dev#/platform-run/service/create?type=package) [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E6%8E%A7%E5%88%B6%E5%8F%B0%E9%83%A8%E7%BD%B2 "控制台部署的直接链接")

打开 [腾讯云托管](https://tcb.cloud.tencent.com/dev#/platform-run), 点击 `通过本地代码部署` -> 填写服务名称 -> 部署方式选择 `上传代码包` -> 代码包类型选择 `文件夹` -> 选择 cloudrun-django 目录进行上传 -> 端口填写 8080 -> 点击创建并等待创建完成即可。

### 通过 cli 部署 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%80%9A%E8%BF%87-cli-%E9%83%A8%E7%BD%B2 "通过 cli 部署的直接链接")

如果您已经安装了 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/intro)，可以在项目目录下使用以下命令将应用部署到 CloudBase 云托管：

````codeBlockLines_e6Vv
tcb cloudrun deploy -p 8080

````

输入环境和服务名称后，CLI 会自动打包应用像并部署到云托管。

除了手动部署外，你也可以一键安装上述应用：

### 一键从模版部署 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E4%B8%80%E9%94%AE%E4%BB%8E%E6%A8%A1%E7%89%88%E9%83%A8%E7%BD%B2 "一键从模版部署的直接链接")

[![](https://main.qcloudimg.com/raw/67f5a389f1ac6f3b4d04c7256438e44f.svg)](https://tcb.cloud.tencent.com/dev#/platform-run/service/create?type=template&templateId=a6ec3048681b19c70291abb521d307bc)

### 一键从 github 部署 [](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E4%B8%80%E9%94%AE%E4%BB%8E-github-%E9%83%A8%E7%BD%B2 "一键从 github 部署的直接链接")

[![](https://main.qcloudimg.com/raw/67f5a389f1ac6f3b4d04c7256438e44f.svg)](https://tcb.cloud.tencent.com/dev#/platform-run/service/create?type=publicGit&repoUrl=https://github.com/TencentCloudBase/tcbr-templates&repoBranch=main&serverName=example-django&port=8080&buildDir=cloudrun-django)

- [创建一个 Django 应用](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E5%88%9B%E5%BB%BA%E4%B8%80%E4%B8%AA-django-%E5%BA%94%E7%94%A8)
  - [配置依赖项](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%85%8D%E7%BD%AE%E4%BE%9D%E8%B5%96%E9%A1%B9)
- [配置 Dockerfile](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%85%8D%E7%BD%AE-dockerfile)
- [部署到云托管](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%83%A8%E7%BD%B2%E5%88%B0%E4%BA%91%E6%89%98%E7%AE%A1)
  - [控制台部署](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E6%8E%A7%E5%88%B6%E5%8F%B0%E9%83%A8%E7%BD%B2)
  - [通过 cli 部署](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E9%80%9A%E8%BF%87-cli-%E9%83%A8%E7%BD%B2)
  - [一键从模版部署](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E4%B8%80%E9%94%AE%E4%BB%8E%E6%A8%A1%E7%89%88%E9%83%A8%E7%BD%B2)
  - [一键从 github 部署](https://docs.cloudbase.net/run/develop/languages-frameworks/django#%E4%B8%80%E9%94%AE%E4%BB%8E-github-%E9%83%A8%E7%BD%B2)

---
[跳到主要内容](https://docs.cloudbase.net/run/develop/networking/private_networking#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

# 内网访问

云托管支持服务间以内网域名的方式进行内网调用，提供安全性高、时延低、效率高的内网通讯服务。每个服务开启内网访问后，均会分配一个内网域名。

默认情况下，所有项目的内网访问都是关闭的，您需要主动开启内网访问功能。开启内网功能后，您将获得一个新的 DNS 名称。此 DNS 名称将解析为环境内服务的内部 IP 地址。

---
[跳到主要内容](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# .NET 快速开始

本文档介绍从零开始手动将一个 .NET 应用容器化，并部署到腾讯云托管（CloudBase Run）。

## 第 1 步：编写基础应用 [](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-1-%E6%AD%A5%E7%BC%96%E5%86%99%E5%9F%BA%E7%A1%80%E5%BA%94%E7%94%A8 "第 1 步：编写基础应用的直接链接")

安装 [.NET Core SDK 3.1](https://www.microsoft.com/net/core)。在 Console 中，使用 dotnet 命令新建一个空 Web 项目：

````codeBlockLines_e6Vv
dotnet new web -o helloworld-csharp
cd helloworld-csharp

````

更新 `Program.cs` 中的 `CreateHostBuilder` 定义，侦听 `80` 端口：

````codeBlockLines_e6Vv
using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace helloworld_csharp
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args)
        {
            string port = "80";
            string url = String.Concat("http://0.0.0.0:", port);

            return Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>().UseUrls(url);
                });
        }
    }
}

````

将 `Startup.cs` 的内容更新为如下：

````codeBlockLines_e6Vv
using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace helloworld_csharp
{
    public class Startup
    {
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapGet("/", async context =>
                {
                    await context.Response.WriteAsync("Hello World!\n");
                });
            });
        }
    }
}

````

以上代码会创建一个基本的 Web 服务器，并监听 `80` 端口。

## 第 2 步：将应用容器化 [](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-2-%E6%AD%A5%E5%B0%86%E5%BA%94%E7%94%A8%E5%AE%B9%E5%99%A8%E5%8C%96 "第 2 步：将应用容器化的直接链接")

在项目根目录下，创建一个名为 `Dockerfile` 的文件，内容如下：

````codeBlockLines_e6Vv
# 使用微软官方 .NET 镜像作为构建环境
# https://hub.docker.com/_/microsoft-dotnet-core-sdk/
FROM mcr.microsoft.com/dotnet/core/sdk:3.1-alpine AS build
WORKDIR /app

# 安装依赖
COPY *.csproj ./
RUN dotnet restore

# 将本地代码拷贝到容器内
COPY . ./
WORKDIR /app

# 构建项目
RUN dotnet publish -c Release -o out

# 使用微软官方 .NET 镜像作为运行时镜像
# https://hub.docker.com/_/microsoft-dotnet-core-aspnet/
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS runtime
WORKDIR /app
COPY --from=build /app/out ./

# 启动服务
ENTRYPOINT ["dotnet", "helloworld-csharp.dll"]

````

添加一个 `.dockerignore` 文件，以从容器映像中排除文件：

````codeBlockLines_e6Vv
**/obj/
**/bin/

````

## 第 3 步（可选）：本地构建镜像 [](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-3-%E6%AD%A5%E5%8F%AF%E9%80%89%E6%9C%AC%E5%9C%B0%E6%9E%84%E5%BB%BA%E9%95%9C%E5%83%8F "第 3 步（可选）：本地构建镜像的直接链接")

如果您本地已经安装了 Docker，可以运行以下命令，在本地构建 Docker 镜像：

````codeBlockLines_e6Vv
docker build -t helloworld-csharp .

````

构建成功后，运行 `docker images`，可以看到构建出的镜像：

````codeBlockLines_e6Vv
REPOSITORY          TAG       IMAGE ID         CREATED            SIZE
helloworld-csharp   latest    1c8dfb88c823     8 seconds ago      105MB

````

随后您可以将此镜像上传至您的镜像仓库。

执行以下命令来运行容器：

````codeBlockLines_e6Vv
docker run  -p 80:80  helloworld-csharp

````

访问 `http://localhost`，您应该能看到 "Hello World!" 的输出。

## 第 4 步：部署到 CloudBase 云托管 [](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E5%88%B0-cloudbase-%E4%BA%91%E6%89%98%E7%AE%A1 "第 4 步：部署到 CloudBase 云托管的直接链接")

如果您已经安装了 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/intro)，可以在项目目录下使用以下命令将应用部署到 CloudBase 云托管：

````codeBlockLines_e6Vv
tcb cloudrun deploy

````

输入环境和服务名称后，CLI 会自动打包应用像并部署到云托管。更多部署方式请参考 [部署服务](https://docs.cloudbase.net/run/quick-start/introduce)。

- [第 1 步：编写基础应用](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-1-%E6%AD%A5%E7%BC%96%E5%86%99%E5%9F%BA%E7%A1%80%E5%BA%94%E7%94%A8)
- [第 2 步：将应用容器化](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-2-%E6%AD%A5%E5%B0%86%E5%BA%94%E7%94%A8%E5%AE%B9%E5%99%A8%E5%8C%96)
- [第 3 步（可选）：本地构建镜像](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-3-%E6%AD%A5%E5%8F%AF%E9%80%89%E6%9C%AC%E5%9C%B0%E6%9E%84%E5%BB%BA%E9%95%9C%E5%83%8F)
- [第 4 步：部署到 CloudBase 云托管](https://docs.cloudbase.net/run/quick-start/dockerize-dotnet#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E5%88%B0-cloudbase-%E4%BA%91%E6%89%98%E7%AE%A1)

---
[跳到主要内容](https://docs.cloudbase.net/run/quick-start/dockerize-node#__docusaurus_skipToContent_fallback)

🚀 [**CloudBase AI ToolKit 发布**: 云开发官方 AI 工具包，支持主流 AI IDE，AI 辅助快速构建全栈应用并自动部署上线](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/) ✨

本页总览

# Node.js 快速开始

本文档介绍从零开始手动将一个 Node.js 应用容器化，并部署到 CloudBase 云托管服务。

代码示例：

[https://github.com/TencentCloudBase/cloudbase-examples/tree/master/cloudbaserun/node](https://github.com/TencentCloudBase/cloudbase-examples/tree/master/cloudbaserun/node)

或者一键部署到云托管：

[![](https://main.qcloudimg.com/raw/67f5a389f1ac6f3b4d04c7256438e44f.svg)](https://tcb.cloud.tencent.com/dev#/platform-run/service/create?type=publicGit&repoUrl=https://github.com/TencentCloudBase/cloudbase-examples&repoBranch=master&serverName=example-node&port=80&buildDir=cloudbaserun/node)

## 第 1 步：编写基础应用 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-1-%E6%AD%A5%E7%BC%96%E5%86%99%E5%9F%BA%E7%A1%80%E5%BA%94%E7%94%A8 "第 1 步：编写基础应用的直接链接")

创建名为 `helloworld` 的新目录，并转到此目录中：

````codeBlockLines_e6Vv
mkdir helloworld
cd helloworld

````

创建一个包含以下内容的 `package.json` 文件：

````codeBlockLines_e6Vv
{
  "name": "helloworld",
  "description": "Simple hello world sample in Node",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "author": "Tencent CloudBase",
  "license": "Apache-2.0"
}

````

在同一目录中，创建一个 `index.js` 文件，并将以下代码行复制到其中：

````codeBlockLines_e6Vv
import { createServer } from "node:http";
import { Readable } from "node:stream";

const server = createServer(async (req, res) => {
  if (req.url === "/") {
    res.writeHead(200);
    res.end("Hello World!");
  } else if (req.url === "/myip") {
    // 设置 CORS 头，允许跨域请求
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      // 使用 fetch 获取远程数据（这里使用 ipinfo.io 作为示例）
      const response = await fetch("https://ipinfo.io", {
        headers: {
          Accept: "application/json",
        },
      });
      Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
      console.error(error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Failed to fetch remote data" }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

const port = 80;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log(
    `Try accessing http://localhost:${port}/myip to see your IP info`
  );
});

````

此代码会创建一个基本的 Web 服务器，侦听 `80` 端口。

## 第 2 步：将应用容器化 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-2-%E6%AD%A5%E5%B0%86%E5%BA%94%E7%94%A8%E5%AE%B9%E5%99%A8%E5%8C%96 "第 2 步：将应用容器化的直接链接")

在项目根目录下，创建一个名为 `Dockerfile` 的文件，内容如下：

````codeBlockLines_e6Vv
# 使用官方 Node.js 轻量级镜像.
# https://hub.docker.com/_/node
FROM node:22-alpine

# 设置时区
RUN apk add tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo Asia/Shanghai > /etc/timezone && \
    apk del tzdata

# 定义工作目录
WORKDIR /app

# 将依赖定义文件拷贝到工作目录下
COPY package*.json ./

# 使用国内镜像源安装依赖
# RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ && \
#     npm install --only=production && \
#     npm cache clean --force

# 将本地代码复制到工作目录内
COPY . .

# 暴露端口
EXPOSE 80

# 启动服务
CMD [ "node", "index.js" ]

````

添加一个 `.dockerignore` 文件，以从容器映像中排除文件：

````codeBlockLines_e6Vv
Dockerfile
.dockerignore
node_modules
npm-debug.log

````

## 第 3 步（可选）：本地构建和运行 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-3-%E6%AD%A5%E5%8F%AF%E9%80%89%E6%9C%AC%E5%9C%B0%E6%9E%84%E5%BB%BA%E5%92%8C%E8%BF%90%E8%A1%8C "第 3 步（可选）：本地构建和运行的直接链接")

如果您本地已经安装了 Docker，可以运行以下命令，在本地构建 Docker 镜像：

````codeBlockLines_e6Vv
docker build -t helloworld-nodejs .

````

构建成功后，运行 `docker images`，可以看到构建出的镜像：

````codeBlockLines_e6Vv
REPOSITORY     TAG       IMAGE ID         CREATED          SIZE
helloworld-nodejs   latest    1c8dfb88c823     8 seconds ago      163MB

````

随后您可以将此镜像上传至您的镜像仓库。

````codeBlockLines_e6Vv
docker run  -p 80:80  helloworld-nodejs

````

访问 `http://localhost`，您应该能看到 "Hello World!" 的输出，访问 `http://localhost/myip`，您应该能看到您的 IP 信息。

## 第 4 步：部署到 CloudBase 云托管 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E5%88%B0-cloudbase-%E4%BA%91%E6%89%98%E7%AE%A1 "第 4 步：部署到 CloudBase 云托管的直接链接")

如果您已经安装了 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/intro)，可以在项目目录下使用以下命令将应用部署到 CloudBase 云托管：

````codeBlockLines_e6Vv
tcb cloudrun deploy

````

输入环境和服务名称后，CLI 会自动打包应用像并部署到云托管。更多部署方式请参考 [部署服务](https://docs.cloudbase.net/run/quick-start/introduce)。

## 配置规范 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E9%85%8D%E7%BD%AE%E8%A7%84%E8%8C%83 "配置规范的直接链接")

- 配置一般放到项目目录中，或者使用环境变量配置
- 服务部署时，在云托管上指定服务的启动端口即可
- 建议使用环境变量来管理不同环境的配置

## 最佳实践 [](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5 "最佳实践的直接链接")

1. 只安装生产环境依赖以减小镜像体积
2. 使用国内镜像源加速依赖安装
3. 合理设置容器时区
4. 使用 .dockerignore 排除不必要的文件

Nodejs 框架项目示例可以参考：

- [创建一个 express 应用](https://docs.cloudbase.net/run/develop/languages-frameworks/express)
- [创建一个 nest.js 应用](https://docs.cloudbase.net/run/develop/languages-frameworks/nest)

- [第 1 步：编写基础应用](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-1-%E6%AD%A5%E7%BC%96%E5%86%99%E5%9F%BA%E7%A1%80%E5%BA%94%E7%94%A8)
- [第 2 步：将应用容器化](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-2-%E6%AD%A5%E5%B0%86%E5%BA%94%E7%94%A8%E5%AE%B9%E5%99%A8%E5%8C%96)
- [第 3 步（可选）：本地构建和运行](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-3-%E6%AD%A5%E5%8F%AF%E9%80%89%E6%9C%AC%E5%9C%B0%E6%9E%84%E5%BB%BA%E5%92%8C%E8%BF%90%E8%A1%8C)
- [第 4 步：部署到 CloudBase 云托管](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E7%AC%AC-4-%E6%AD%A5%E9%83%A8%E7%BD%B2%E5%88%B0-cloudbase-%E4%BA%91%E6%89%98%E7%AE%A1)
- [配置规范](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E9%85%8D%E7%BD%AE%E8%A7%84%E8%8C%83)
- [最佳实践](https://docs.cloudbase.net/run/quick-start/dockerize-node#%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
