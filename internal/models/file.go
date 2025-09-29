package models

import "time"

type FileInfo struct{
	Name		 string	   `json:"name"` //file name
	Size         int64     `json:"size"` //file size in bytes
	Path         string    `json:"path"` //file path
	IsDir 	     bool      `json:"isDir"` //is directory
	ModTime 	time.Time  `json:"modTime"` //last modified time

}

type UploadResponse struct{
	Success bool `json:"success"` //to indicate if upload was successful
	Message string `json:"message"` //human readable message
	Filename string `json:"filename"` //name of the uploaded file
}

type ErrorResponse struct{
	Error string `json:"error"` //error message
	Code int `json:"code"` //http status code
	Message string `json:"message"` //detailed error message
}



