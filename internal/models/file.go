package models

import "time"

type FileInfo struct{
	Name		 string	   `jason:"name"` //file name
	Size         int64     `json:"size"` //file size in bytes
	Path         string    `json:"path"` //file path
	IsDir 	     bool      `json:"isDir"` //is directory
	ModTime 	time.Time  `json:"modTime"` //last modified time

}

type UploadRespopnse struct{
	Success bool `json:"success"` //to indicate if upload was successful
	Message string `jason:"message"` //human readable message
	FileName string `json:"fileName"` //name of the uploaded file
}

type ErrorResponse struct{
	Error string `json:"error"` //error message
	Code int `json:"code"` //http status code
	Message string `json:"message"` //detailed error message
}



