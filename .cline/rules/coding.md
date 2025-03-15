# コーディングベストプラクティス

以下にコーディングにおいて、意識してほしいことを記載します。

## 基本原則

- コードの可読性を最優先 し、コメントや `Typedoc` を活用する  
- ドメイン駆動設計（DDD） を意識して責務を適切に分割する  
- 必ずテストを追加する
- テスト駆動開発（TDD） を推奨する  
- 関数名・変数名は他の開発者が理解しやすいものにする  

### 1. コードの可読性を向上させる

コードは 「他の開発者が一目で理解できる」 ことを目指す。

✅ 推奨

```ts
/
 * ユーザー情報を取得する
 * @param userId - ユーザーの一意識別子
 * @returns ユーザー情報
 */
async function getUserInfo(userId: string): Promise<User> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}
```

- `Typedoc` 形式で関数の目的・引数・戻り値を明記
- 変数名は明確 (`userId` → `u` のような省略形は避ける)
- エラーメッセージは具体的に

### 2. ドメイン駆動設計（DDD）を意識する

コードの責務を明確にし、ドメイン層・アプリケーション層・インフラ層に分離する。

✅ 推奨

```ts
// ドメイン層
class User {
  constructor(public id: string, public name: string, public email: string) {}
}

// リポジトリ層（インフラ）
class UserRepository {
  async findById(userId: string): Promise<User | null> {
    return db.findUserById(userId);
  }
}

// アプリケーション層（ユースケース）
class GetUserInfoService {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }
}
```

- ドメイン層: `User` エンティティを定義
- アプリケーション層: `GetUserInfoService` でユースケースを定義
- インフラ層: `UserRepository` でデータアクセスを分離

### 3. 必ずテストを追加する

すべての変更に ユニットテスト・統合テスト を追加し、品質を保証する。

```ts
import { GetUserInfoService } from "../application/GetUserInfoService";

test("ユーザー情報が取得できる", async () => {
  const mockRepository = {
    findById: jest.fn().mockResolvedValue(new User("1", "Alice", "alice@example.com")),
  };
  const service = new GetUserInfoService(mockRepository);
  const user = await service.execute("1");

  expect(user.name).toBe("Alice");
});
```

- モックを活用し、依存関係を排除
- 期待値を明確にチェック（`expect(user.name).toBe("Alice")`）

### 4. テスト駆動開発（TDD）を意識する

実装前にテストを書くことで 設計の品質を向上 させる。

✅ 推奨（TDD の流れ）

1. 失敗するテストを書く

```ts
test("新しいユーザーを作成できる", async () => {
  const user = await createUserService.execute("Bob", "bob@example.com");
  expect(user.id).toBeDefined();
});
```

2. 最小限の実装を追加

```ts
class CreateUserService {
  async execute(name: string, email: string): Promise<User> {
    return new User("1", name, email);
  }
}
```

3. テストをパスするように実装を拡張

```ts
class CreateUserService {
  constructor(private userRepository: UserRepository) {}

  async execute(name: string, email: string): Promise<User> {
    const user = new User(uuid(), name, email);
    await this.userRepository.save(user);
    return user;
  }
}
```

### 5. 関数名・変数名は分かりやすく

他の人が見ても迷わない命名 を意識する。

✅ 推奨

```ts
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}
```

🚫 非推奨

```ts
function calc(items: any) {
  return items.reduce((t, i) => t + i.p, 0);
}
```

- `calculateTotalPrice` など、動詞 + 名詞 の形式で明確に
- `t, i, p` のような省略形は使わない
