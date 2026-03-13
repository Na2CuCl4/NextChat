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
