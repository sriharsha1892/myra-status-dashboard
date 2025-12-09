'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import modals to reduce initial bundle size
const CreateOrganizationModal = dynamic(() => import('@/components/CreateOrganizationModal'));
const AddTrialUserModal = dynamic(() => import('@/components/AddTrialUserModal'));
const AddFeatureRequestModal = dynamic(() => import('@/components/AddFeatureRequestModal'));
const AddRoadmapItemModal = dynamic(() => import('@/components/AddRoadmapItemModal'));
const AddSupportQueryModal = dynamic(() => import('@/components/AddSupportQueryModal'));
const AddTimelineEventModal = dynamic(() => import('@/components/AddTimelineEventModal'));

// Map form types to actual modal components
// Some modals may not exist yet - they will be null
const MODAL_COMPONENTS: Record<string, React.ComponentType<any> | null> = {
  'CreateOrganizationModal': CreateOrganizationModal,
  'CreateUserModal': AddTrialUserModal,
  'CreateTicketModal': AddSupportQueryModal, // Using AddSupportQueryModal as closest match
  'CreateFeatureRequestModal': AddFeatureRequestModal,
  'CreateRoadmapItemModal': AddRoadmapItemModal,
  'CreateTimelineEventModal': AddTimelineEventModal,
  'EditOrganizationModal': null, // Not implemented yet
  'EditUserModal': null, // Not implemented yet
};

export interface CommandModalState {
  isOpen: boolean;
  modalType: string | null;
  prefillData: Record<string, any>;
  onSuccess?: () => void;
}

export interface CommandModalContextType {
  openModal: (type: string, prefillData?: Record<string, any>, onSuccess?: () => void) => boolean;
  closeModal: () => void;
  modalState: CommandModalState;
}

const CommandModalContext = createContext<CommandModalContextType | undefined>(undefined);

export function CommandModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<CommandModalState>({
    isOpen: false,
    modalType: null,
    prefillData: {},
    onSuccess: undefined,
  });

  const openModal = useCallback((
    type: string,
    prefillData: Record<string, any> = {},
    onSuccess?: () => void
  ): boolean => {
    // Check if modal type is supported
    if (!MODAL_COMPONENTS[type]) {
      console.warn(`Modal type "${type}" is not supported yet`);
      return false;
    }

    setModalState({
      isOpen: true,
      modalType: type,
      prefillData,
      onSuccess,
    });
    return true;
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
    // Clear state after animation
    setTimeout(() => {
      setModalState({
        isOpen: false,
        modalType: null,
        prefillData: {},
        onSuccess: undefined,
      });
    }, 300);
  }, []);

  const handleSuccess = useCallback(() => {
    if (modalState.onSuccess) {
      modalState.onSuccess();
    }
    closeModal();
  }, [modalState.onSuccess, closeModal]);

  // Get the current modal component
  const ModalComponent = modalState.modalType
    ? MODAL_COMPONENTS[modalState.modalType]
    : null;

  // Map prefill data to modal props based on modal type
  const getModalProps = () => {
    if (!modalState.modalType) return {};

    const baseProps = {
      isOpen: modalState.isOpen,
      onClose: closeModal,
      onSuccess: handleSuccess,
    };

    switch (modalState.modalType) {
      case 'CreateOrganizationModal':
        return {
          ...baseProps,
          defaultValues: {
            orgName: modalState.prefillData.org_name,
            orgDomain: modalState.prefillData.domain,
            orgUrl: modalState.prefillData.website,
            orgTeamSize: modalState.prefillData.team_size,
          },
        };

      case 'CreateUserModal':
        return {
          ...baseProps,
          orgId: modalState.prefillData.org_id,
          defaultValues: {
            name: modalState.prefillData.user_name,
            email: modalState.prefillData.email,
            role: modalState.prefillData.role,
          },
        };

      case 'CreateTicketModal':
        return {
          ...baseProps,
          orgId: modalState.prefillData.org_id || '',
          defaultValues: {
            title: modalState.prefillData.ticket_title,
            description: modalState.prefillData.ticket_description,
            priority: modalState.prefillData.ticket_priority,
            category: modalState.prefillData.ticket_category,
          },
        };

      case 'CreateFeatureRequestModal':
        return {
          ...baseProps,
          orgId: modalState.prefillData.org_id,
          defaultValues: {
            title: modalState.prefillData.feature_title,
            description: modalState.prefillData.feature_description,
            use_case: modalState.prefillData.use_case,
            priority: modalState.prefillData.priority,
          },
        };

      case 'CreateRoadmapItemModal':
        return {
          ...baseProps,
          orgId: modalState.prefillData.org_id,
          defaultValues: {
            title: modalState.prefillData.roadmap_title,
            description: modalState.prefillData.roadmap_description,
            status: modalState.prefillData.roadmap_status,
            priority: modalState.prefillData.roadmap_priority,
            target_date: modalState.prefillData.target_date,
          },
        };

      case 'CreateTimelineEventModal':
        return {
          ...baseProps,
          orgId: modalState.prefillData.org_id,
          orgName: modalState.prefillData.org_name,
          defaultValues: {
            event_type: modalState.prefillData.event_type,
            event_category: modalState.prefillData.event_category,
            title: modalState.prefillData.event_title,
            description: modalState.prefillData.event_description,
          },
        };

      default:
        return baseProps;
    }
  };

  return (
    <CommandModalContext.Provider value={{ openModal, closeModal, modalState }}>
      {children}
      {/* Render active modal */}
      {ModalComponent && modalState.isOpen && (
        <ModalComponent {...getModalProps()} />
      )}
    </CommandModalContext.Provider>
  );
}

export function useCommandModal() {
  const context = useContext(CommandModalContext);
  if (context === undefined) {
    throw new Error('useCommandModal must be used within CommandModalProvider');
  }
  return context;
}

// Helper to check if a modal type is supported
export function isModalSupported(type: string): boolean {
  return !!MODAL_COMPONENTS[type];
}
