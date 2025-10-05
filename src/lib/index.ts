// Library exports
export {
  KnowledgeBaseService,
  knowledgeBaseService,
  useKnowledgeBase
} from './knowledgeBaseService'
export type {
  KnowledgeBaseContent,
  ContentListOptions,
  ContentUpdateOptions,
  ContentUploadOptions
} from './knowledgeBaseService'

export {
  validateImageFile,
  validateImageFiles,
  canAddImage,
  IMAGE_VALIDATION
} from './imageValidation'
