### 工程目录结构
```
├── server.js  
├── controllers  
|   └── User.js  
```

### Valka
```javascript
import {Valka} from 'valka'

Valka({
  baseDir: __dirname,
  port: 3000,
  enableAuth: true,
  jwtSecret: "xxx",
})
```

### Controller
```javascript
import {Controller, Get, IContext, RequireLogin} from 'valka'

@Controller('/api/users')
export class User {
  @Get('/', 'index.html')
  async render() {
    return { title: "title" }
  }

  @Get('/')
  @RequireLogin()
  async getUsers (ctx: IContext) {
    const ctx.state.user
    return { users: [user] }
  }
}
```

### 使用
``` shell
npm i valka --save
```