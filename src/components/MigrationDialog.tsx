import { useState } from 'react';
import { X, Cloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../lib/data-service';

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MigrationDialog({ isOpen, onClose }: MigrationDialogProps) {
  const { setNeedsMigration } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<'success' | 'error' | null>(null);
  const [migratedCount, setMigratedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    setErrorMessage('');

    try {
      const result = await dataService.migrateGuestData();

      if (result.success) {
        setMigrationResult('success');
        setMigratedCount(result.count);
        setNeedsMigration(false);

        // Auto close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMigrationResult('error');
        setErrorMessage('迁移失败，请稍后重试');
      }
    } catch (error: any) {
      setMigrationResult('error');
      setErrorMessage(error.message || '迁移过程中发生错误');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    setNeedsMigration(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-purple-500" />
              <h2 className="text-base font-medium text-purple-900">数据迁移</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-purple-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {migrationResult === 'success' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">迁移成功!</h3>
              <p className="text-sm text-gray-500">
                已成功迁移 {migratedCount} 条记录到云端
              </p>
            </div>
          ) : migrationResult === 'error' ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">迁移失败</h3>
              <p className="text-sm text-gray-500 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => setMigrationResult(null)}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                重试
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Cloud className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  发现本地数据
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  检测到您有游客模式下创建的记录数据。是否将数据迁移到云端账号？
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-purple-900 mb-2">迁移说明</h4>
                <ul className="space-y-1 text-xs text-purple-700">
                  <li>• 本地数据将上传到云端</li>
                  <li>• 迁移后可在多设备访问</li>
                  <li>• 本地数据将被清除</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>迁移中...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-5 h-5" />
                      <span>立即迁移</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSkip}
                  disabled={isMigrating}
                  className="w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-50"
                >
                  稍后再说
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
