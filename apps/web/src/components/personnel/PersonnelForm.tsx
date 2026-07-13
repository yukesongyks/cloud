'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { trpc } from '@/lib/trpc/client';
import type { Position, Level, Status } from '@/routers/personnel-router';

type FormData = {
  name: string;
  position: Position;
  level: Level;
  age: number;
  baseLocation: string;
  status: Status;
};

interface PersonnelFormProps {
  organizationId: string;
  personnelId?: string | null;
  onClose: () => void;
}

export function PersonnelForm({
  organizationId,
  personnelId,
  onClose,
}: PersonnelFormProps) {
  const isEditing = !!personnelId;

  const { data: personnel } = trpc.personnel.get.useQuery(
    { id: personnelId! },
    { enabled: isEditing }
  );

  const createMutation = trpc.personnel.create.useMutation({
    onSuccess: () => {
      onClose();
    },
  });

  const updateMutation = trpc.personnel.update.useMutation({
    onSuccess: () => {
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      status: 'active',
    },
  });

  useEffect(() => {
    if (personnel) {
      reset({
        name: personnel.name,
        position: personnel.position as Position,
        level: personnel.level as Level,
        age: personnel.age,
        baseLocation: personnel.baseLocation,
        status: personnel.status as Status,
      });
    }
  }, [personnel, reset]);

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({
        id: personnelId!,
        ...data,
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        organizationId,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? '编辑人员' : '新增人员'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input
              {...register('name', { required: '请输入姓名' })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">岗位</label>
            <select
              {...register('position', { required: '请选择岗位' })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">请选择</option>
              <option value="developer">开发</option>
              <option value="designer">设计</option>
              <option value="product_manager">产品</option>
              <option value="tester">测试</option>
              <option value="operations">运维</option>
              <option value="other">其他</option>
            </select>
            {errors.position && (
              <p className="text-red-500 text-sm mt-1">
                {errors.position.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">职级</label>
            <select
              {...register('level', { required: '请选择职级' })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">请选择</option>
              <option value="junior">初级</option>
              <option value="intermediate">中级</option>
              <option value="senior">高级</option>
              <option value="expert">专家</option>
              <option value="architect">架构师</option>
            </select>
            {errors.level && (
              <p className="text-red-500 text-sm mt-1">
                {errors.level.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">年龄</label>
            <input
              type="number"
              {...register('age', {
                required: '请输入年龄',
                min: { value: 18, message: '年龄必须大于等于18岁' },
                max: { value: 100, message: '年龄必须小于等于100岁' },
              })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.age && (
              <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Base地</label>
            <input
              {...register('baseLocation', { required: '请输入Base地' })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.baseLocation && (
              <p className="text-red-500 text-sm mt-1">
                {errors.baseLocation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">状态</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="active">在职</option>
              <option value="resigned">已离职</option>
              <option value="on_leave">请假中</option>
              <option value="probation">试用期</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isEditing ? '保存' : '创建'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}