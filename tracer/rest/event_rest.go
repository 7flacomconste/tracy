package rest

import (
	"encoding/json"
	"github.com/gorilla/mux"
	"xxterminator-plugin/log"
	"net/http"
	"strconv"
	"xxterminator-plugin/tracer/common"
	"xxterminator-plugin/tracer/types"
	"fmt"
	"xxterminator-plugin/tracer/store"
)

/* Helper function used by AddEvent and AddEvents to add an event to the tracer specified.
 * Returns the HTTP status and the return value. */
func addEventHelper(trcrID int, trcrEvnt types.TracerEvent) (int, []byte) {
	ret := []byte("{}")
	status := http.StatusInternalServerError

	/* Validate the event before uploading it to the database. */
	if trcrEvnt.Data.String == "" {
		ret = []byte("The data field for the event was empty")
		log.Error.Println(ret)
	} else if trcrEvnt.Location.String == "" {
		ret = []byte("The location field for the event was empty")
		log.Error.Println(ret)
	} else if trcrEvnt.EventType.String == "" {
		ret = []byte("The event type field for the event was empty")
		log.Error.Println(ret)
	} else {
		evntStr, err := common.AddEvent(int(trcrID), trcrEvnt)
		if err != nil {
			ret = []byte("There was an error adding the event.")
			log.Error.Println(err)
		} else {
			/* Final success case. */
			status = http.StatusOK
			ret = evntStr
		}
	}

	return status, ret
}

/*AddEvent adds a tracer event to the tracer specified in the URL. */
func AddEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	trcrEvnt := types.TracerEvent{}
	json.NewDecoder(r.Body).Decode(&trcrEvnt)

	/* Add the tracer event. */
	trcrID, err := strconv.ParseInt(vars["tracerID"], 10, 32)
	if err != nil {
		log.Error.Println(err)
	}
	status, ret := addEventHelper(int(trcrID), trcrEvnt)

	w.WriteHeader(status)
	w.Header().Set("Content-Type", "application/json")
	w.Write(ret)
}

/*AddEvents adds multiple tracer events to the tracer specified in the URL. */
func AddEvents(w http.ResponseWriter, r *http.Request) {
	finalStatus := http.StatusOK
	finalRet := make([]byte, 0)
	trcrEvntsBulk := make([]types.TracerEventBulk, 0)
	json.NewDecoder(r.Body).Decode(&trcrEvntsBulk)

	log.Trace.Printf("Decoded the following bulk tracer events: %+v", trcrEvntsBulk)

	/* Count the number of successful events that were added. */
	count := 0

	for _, trcrEvnt := range trcrEvntsBulk {
		/* For each of the tracer strings that were found in the DOM event, find the tracer they are associated with
		 * and add an event to it. */
		for _, trcrStr := range trcrEvnt.TracerStrings {
			trcrID, err := store.DBGetTracerIDByTracerString(store.TracerDB, trcrStr)
			if err != nil {
				/* If there was an error getting the tracer, fail fast and continue to the next one. */
				log.Error.Println(err)
				continue
			}
			/* Add the tracer event. */
			status, ret := addEventHelper(trcrID, trcrEvnt.TracerEvent)

			/* If any of them fail, the whole request status fails. */
			if status == http.StatusInternalServerError {
				finalStatus = http.StatusInternalServerError
				/* Only returns the error for the last failed event addition. */
				finalRet = []byte(fmt.Sprintf(`{"Status":"Internal Server Error", "Error":"%s"}`, ret))
			} else {
				count = count + 1
			}
		}
	}

	if len(finalRet) == 0{
		finalRet = []byte(fmt.Sprintf(`{"Status":"Success", "Count":"%d"}`, count))
	}

	w.WriteHeader(finalStatus)
	w.Header().Set("Content-Type", "application/json")
	w.Write(finalRet)
}