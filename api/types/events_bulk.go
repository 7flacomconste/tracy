package types

/*TracerEventBulk is an event captured from the DOM. TracerEventBulk contains a list of all the tracer strings found in a DOM event. */
type TracerEventBulk struct {
	TracerPayloads []string    `json:"TracerPayloads"`
	TracerEvent    TracerEvent `json:"TracerEvent"`
}
