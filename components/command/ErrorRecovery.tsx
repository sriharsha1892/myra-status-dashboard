'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lightbulb, ChevronRight, Edit2, RefreshCw, X, Building2 } from 'lucide-react';
import type { ParseDiagnostics, EntityMatch } from '@/lib/command/types';

interface ErrorRecoveryProps {
  errorType: 'parse_failed' | 'org_not_found' | 'user_not_found' | 'execution_failed';
  originalText: string;
  errorMessage: string;
  diagnostics?: ParseDiagnostics;
  alternatives?: EntityMatch['alternatives'];
  onRetry?: (editedCommand?: string) => void;
  onSelectAlternative?: (alternativeId: string, alternativeName: string) => void;
  onSkip?: () => void;
}

export function ErrorRecovery({
  errorType,
  originalText,
  errorMessage,
  diagnostics,
  alternatives,
  onRetry,
  onSelectAlternative,
  onSkip,
}: ErrorRecoveryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCommand, setEditedCommand] = useState(originalText);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);

  const handleRetry = () => {
    if (isEditing) {
      onRetry?.(editedCommand);
      setIsEditing(false);
    } else {
      onRetry?.();
    }
  };

  const handleSelectAlternative = (id: string, name: string) => {
    setSelectedAlternative(id);
    onSelectAlternative?.(id, name);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 border border-red-200 rounded-xl p-4"
    >
      {/* Error header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-red-800">
            {errorType === 'parse_failed' && 'Could not understand this command'}
            {errorType === 'org_not_found' && 'Organization not found'}
            {errorType === 'user_not_found' && 'User not found'}
            {errorType === 'execution_failed' && 'Failed to execute'}
          </h4>
          <p className="text-sm text-red-600 mt-0.5">{errorMessage}</p>
        </div>
      </div>

      {/* Original command */}
      <div className="mt-3 p-2 bg-white/50 rounded-lg">
        {isEditing ? (
          <input
            type="text"
            value={editedCommand}
            onChange={(e) => setEditedCommand(e.target.value)}
            className="w-full px-2 py-1 text-sm font-mono bg-white border border-red-200 rounded focus:outline-none focus:ring-2 focus:ring-red-300"
            autoFocus
          />
        ) : (
          <p className="text-sm font-mono text-gray-700">&quot;{originalText}&quot;</p>
        )}
      </div>

      {/* Diagnostics-based suggestions */}
      {diagnostics && diagnostics.suggestions.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Suggestions</span>
          </div>
          <ul className="space-y-1.5">
            {diagnostics.suggestions.map((suggestion, index) => (
              <motion.li
                key={index}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 text-sm text-gray-600"
              >
                <ChevronRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing elements from diagnostics */}
      {diagnostics && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!diagnostics.hasOrgIndicator && (
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
              Missing: organization name
            </span>
          )}
          {!diagnostics.hasActionVerb && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Missing: action verb
            </span>
          )}
        </div>
      )}

      {/* Alternative selections for org_not_found */}
      {errorType === 'org_not_found' && alternatives && alternatives.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Did you mean one of these?</p>
          <div className="space-y-2">
            {alternatives.map((alt) => (
              <motion.button
                key={alt.id}
                onClick={() => handleSelectAlternative(alt.id, alt.name)}
                className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
                  selectedAlternative === alt.id
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-gray-200 hover:border-purple-200'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAlternative === alt.id
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedAlternative === alt.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 bg-white rounded-full"
                      />
                    )}
                  </div>
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-800">{alt.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {alt.metadata?.domain && (
                    <span className="text-xs text-gray-500">{alt.metadata.domain}</span>
                  )}
                  <span className="text-xs font-medium text-purple-600">
                    {Math.round(alt.score * 100)}% match
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          {isEditing ? 'Cancel Edit' : 'Edit Command'}
        </button>

        {(isEditing || errorType !== 'org_not_found') && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}

        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors ml-auto"
        >
          <X className="w-3.5 h-3.5" />
          Skip
        </button>
      </div>
    </motion.div>
  );
}
