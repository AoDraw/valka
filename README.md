### 工程目录结构
```
├── server.js  
├── controllers  
|   └── User.js  
├── services  
|   └── User.js  
└── models  
    └── User.js  
```

### Valka
```javascript
import {Valka} from '@yunyanteng/valka'

Valka({
  baseDir: __dirname,
  port: 3000,
  database: {
    mongodb: {
      url: 'mongodb://localhost:27017/db'
    }
  }
})
```

### Model
```javascript
import { Model } from '@yunyanteng/valka'

@Model
export default class User {
  static schema = {
    name: String
  }
}
```

### Service
```javascript
import {Service, AutowiredModel} from '@yunyanteng/valka'

@Service
export class User {
  @AutowiredModel('User')
  static UserModel

  async getUsers () {
    return User.UserModel.find()
  }
}
```

### Controller
```javascript
import {Controller, AutowiredService, Get} from '@yunyanteng/valka'

@Controller('/api/users')
export class User {
  @AutowiredService('User')
  static UserService

  @Get('/')
  async getUsers () {
    return User.UserService.getUsers()
  }
}
```

### 使用
``` shell
npm adduser --registry http://npm.aonaotu.com --scope=@yunyanteng
npm install @yunyanteng/valka
```
