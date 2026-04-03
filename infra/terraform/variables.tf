variable "region" {
  description = "region"
  default     = "ap-northeast-2"
}

variable "prefix" {
  description = "Prefix for all resources"
  default     = "devcos-team05"
}

variable "app_1_domain" {
  description = "app_1 domain"
  default     = "api.maum-on.parksuyeon.site"
}

variable "app_1_s3_bucket_name" {
  description = "S3 bucket name for image/file storage. Leave empty to use generated name."
  default     = ""
}
