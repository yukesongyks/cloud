# 环境部署检查清单 - 人员信息录入与数据看板功能

## 部署概述
- **任务ID**: task-DEV-ddccb2af-7620-11f1-9e19-e337058ec5b9-fc1310a5-61f4-4ba0-adb2-8d305b448d6c
- **功能**: 人员信息录入与数据看板
- **生成时间**: 2026-07-13 23:51 UTC
- **验证模式**: 静态代码审查（降级）

---

## [降级说明]
- **原因**: 环境缺少 pnpm 工具，无法执行构建验证
- **已审查逻辑点**:
  - Schema 定义完整（packages/db/src/schema.ts 第7142-7187行）
  - Router 实现了 CRUD 和看板统计接口
  - 组件包含 PersonneList, PersonnelForm, PersonnelDashboard

---

## 一、数据库变更

### 1.1 Schema 定义
| 表名 | 状态 | 字段验证 |
|---|---|---|
| personnel | ✅ 已定义 | id, organizationId, name, position, level, age, baseLocation, status, createdAt, updatedAt |

### 1.2 索引
| 索引名 | 字段 | 状态 |
|---|---|---|
| personnel_org_idx | organizationId | ✅ |
| personnel_position_idx | position | ✅ |
| personnel_level_idx | level | ✅ |
| personnel_status_idx | status | ✅ |

### 1.3 迁移文件
- **检查结果**: migrations 目录存在，最新迁移为 0154
- **操作**: 需要生成新的迁移文件以包含 personnel 表
- **命令**: `pnpm drizzle generate`

---

## 二、API 路由

### 2.1 personnel-router.ts
| 接口 | 方法 | 功能 | 状态 |
|---|---|---|---|
| create | mutation | 创建人员 | ✅ 已实现 |
| update | mutation | 更新人员 | ✅ 已实现 |
| delete | mutation | 删除人员 | ✅ 已实现 |
| list | query | 查询人员列表 | ✅ 已实现 |
| getById | query | 获取单个人员 | ✅ 已实现 |
| dashboardStats | query | 看板统计数据 | ✅ 已实现 |
| exportData | query | 导出数据 | ✅ 已实现 |

### 2.2 root-router.ts
- **状态**: ✅ 已集成 personnelRouter

---

## 三、前端组件

| 组件 | 路径 | 功能 | 状态 |
|---|---|---|---|
| PersonnelList | components/personnel/PersonnelList.tsx | 人员列表展示 | ✅ 已实现 |
| PersonnelForm | components/personnel/PersonnelForm.tsx | 人员信息表单 | ✅ 已实现 |
| PersonnelDashboard | components/personnel/PersonnelDashboard.tsx | 数据看板 | ✅ 已实现 |

---

## 四、部署前检查项

### 4.1 数据库迁移
- [ ] 执行 `pnpm drizzle generate` 生成迁移文件
- [ ] 检查生成的 SQL 文件是否包含 personnel 表 DDL
- [ ] 在测试环境应用迁移: `pnpm drizzle push`

### 4.2 类型检查（需要 pnpm 环境）
- [ ] `pnpm --filter @kilocode/web typecheck`
- [ ] `pnpm --filter @kilocode/db typecheck`

### 4.3 代码格式化（需要 pnpm 环境）
- [ ] `pnpm format`

### 4.4 数据库连接
- [ ] 确认 Hyperdrive 配置正确
- [ ] 确认数据库连接字符串有效

---

## 五、部署步骤

### 5.1 数据库迁移
```bash
# 生成迁移
pnpm drizzle generate

# 应用迁移（开发环境）
pnpm drizzle push

# 或手动执行 SQL
psql -d <database_url> -f packages/db/src/migrations/<new_migration>.sql
```

### 5.2 应用部署
```bash
# Web 应用
cd apps/web
pnpm build
vercel --prod

# 或使用项目部署脚本
pnpm deploy
```

---

## 六、验证清单

### 6.1 功能验证
- [ ] 创建人员信息成功
- [ ] 更新人员信息成功
- [ ] 删除人员信息成功
- [ ] 查询人员列表返回正确数据
- [ ] 看板统计数据按岗位维度展示
- [ ] 看板统计数据按职级维度展示
- [ ] 导出功能生成 CSV 文件

### 6.2 权限验证
- [ ] 仅组织成员可访问
- [ ] 数据隔离（仅显示本组织人员）

---

## 七、回滚方案

如部署失败，执行以下回滚：

```bash
# 回滚数据库迁移
psql -d <database_url> -c "DROP TABLE IF EXISTS personnel;"

# 回滚应用代码
git revert HEAD
git push origin main
```

---

## 八、相关文件清单

| 类型 | 文件路径 |
|---|---|
| Schema | packages/db/src/schema.ts |
| Router | apps/web/src/routers/personnel-router.ts |
| Router Root | apps/web/src/routers/root-router.ts |
| 页面 - 列表 | apps/web/src/app/(app)/personnel/page.tsx |
| 页面 - 看板 | apps/web/src/app/(app)/personnel/dashboard/page.tsx |
| 组件 - 列表 | apps/web/src/components/personnel/PersonnelList.tsx |
| 组件 - 表单 | apps/web/src/components/personnel/PersonnelForm.tsx |
| 组件 - 看板 | apps/web/src/components/personnel/PersonnelDashboard.tsx |

---

## 九、注意事项

1. **首次部署**: 此功能为新增模块，首次部署需要执行数据库迁移
2. **权限隔离**: 确保组织级别数据隔离已生效
3. **索引优化**: 已添加 position、level、status 索引，支持高频查询场景
4. **导出限制**: 大数据量导出建议添加分页或异步处理

---

**生成时间**: 2026-07-13 23:51:16 UTC
**生成模式**: 环境部署阶段（降级 - 静态审查）