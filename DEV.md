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
