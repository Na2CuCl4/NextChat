# 开发说明

## 运行程序

- 开发

```bash
yarn dev
```

- 生产

```bash
yarn build
yarn start
```

## Docker 编译和发布流程

- 编译

```bash
docker build -t na2cucl4/nextchat:v2.18.0 .
```

- 重命名

```bash
docker tag na2cucl4/nextchat:v2.18.0 na2cucl4/nextchat:latest
```

- 登录 Docker Hub

```bash
docker login
```

- 发布

```bash
docker push na2cucl4/nextchat:latest
```

## 读文件插件的 Docker 配置

```yaml
# docker-compose.yml
services:
  nextchat-readfile:
    image: na2cucl4/nextchat-readfile:latest
    container_name: nextchat-readfile
    ports:
      - 127.0.0.1:8000:8000
    restart: always
```
