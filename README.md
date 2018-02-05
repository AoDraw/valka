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
import {Valka} from 'valka'

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
import { Model } from 'valka'

@Model
export default class User {
  static schema = {
    name: String
  }
}
```

### Service
```javascript
import {Service, AutowiredModel} from 'valka'

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
import {Controller, AutowiredService, Get} from 'valka'

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
npm i valka --save
```

## TODO

1. `valka-cli` support. Easily create and bootstrap a Valka project from command line.
2. Add BDD tests.
3. More documentaions.
4. Plugins design for client side project. One can easily integrate its Vue.js or React.js project with Valka project, and `valka-cli` should have this kind of options?
5. ...more
