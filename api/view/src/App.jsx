import React, { Component } from "react";
import TracerTable from "./TracerTable";
import DetailsViewer from "./DetailsViewer";
import FilterColumn from "./FilterColumn";
import TracyLogo from "./TracyLogo";
import TracerEventsTable from "./TracerEventsTable";
import WebSocketRouter from "./WebSocketRouter";
import InstallLinks from "./InstallLinks";
import Col from "react-bootstrap/lib/Col";
import Row from "react-bootstrap/lib/Row";

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			tracers: [],
			tracer: {},
			events: [],
			event: {},
			filters: {
				inactive: false,
				responses: false,
				text: false
			}
		};
		this.handleFilterChange = this.handleFilterChange.bind(this);
		this.handleNewTracer = this.handleNewTracer.bind(this);
		this.handleNewRequest = this.handleNewRequest.bind(this);
		this.handleNewEvent = this.handleNewEvent.bind(this);
		this.handleTracerSelection = this.handleTracerSelection.bind(this);
		this.handleEventSelection = this.handleEventSelection.bind(this);
		this.getTracers = this.getTracers.bind(this);
		this.getTracerEvents = this.getTracerEvents.bind(this);
	}

	/* Helper  to return the URL query parameters as a comma-separated list. */
	parseURLParameters(url) {
		var ret;
		var splitOnParam = url.split("?");
		if (splitOnParam.length > 1) {
			ret = splitOnParam[1].replace("&", ", ");
		} else {
			ret = "";
		}

		return ret;
	}

	/* Helper  to return the hostname from a URL string. */
	parseHost(url) {
		var ret;

		// In case the url has a protocol, remove it.
		var protocolSplit = url.split("://");
		var withoutProtocol;
		if (protocolSplit.length > 1) {
			withoutProtocol = protocolSplit[1];
		} else {
			withoutProtocol = protocolSplit[0];
		}

		var host = withoutProtocol.split("?")[0];
		var pathIndex = host.indexOf("/");

		if (pathIndex !== -1) {
			ret = host.substring(0, pathIndex);
		} else {
			ret = host;
		}

		return ret;
	}

	/* Helper  to return the path from a URL string. */
	parsePath(url) {
		var ret = "";

		// In case the url has a protocol, remove it.
		var protocolSplit = url.split("://");
		var withoutProtocol;
		if (protocolSplit.length > 1) {
			withoutProtocol = protocolSplit[1];
		} else {
			withoutProtocol = protocolSplit[0];
		}

		var host = withoutProtocol.split("?")[0];
		var pathIndex = host.indexOf("/");
		if (pathIndex !== -1) {
			ret = host.substring(pathIndex, host.length);
		} else {
			ret = "/";
		}

		return ret;
	}

	/* Message the request objects into a set of tracer data structure so the table can read their columns. */
	formatRequest(request) {
		if (request.Tracers) {
			return request.Tracers.map(tracer => {
				return {
					ID: tracer.ID,
					RawRequest: request.RawRequest,
					RequestMethod: request.RequestMethod,
					RequestURL: this.parseHost(request.RequestURL),
					RequestPath: this.parsePath(request.RequestURL),
					TracerString: tracer.TracerString,
					TracerPayload: tracer.TracerPayload,
					TracerLocationIndex: tracer.TracerLocationIndex,
					TracerLocationType: tracer.TracerLocationType,
					OverallSeverity: tracer.OverallSeverity,
					HasTracerEvents: tracer.HasTracerEvents
				};
			});
		}
	}

	/* Format all the event contexts into their corresponding columns. */
	formatEvent(event, eidx) {
		// Enum to human-readable structure to translate the various DOM contexts.
		const locationTypes = {
			0: "attribute name",
			1: "text",
			2: "node name",
			3: "attribute value",
			4: "comment block"
		};

		var ret = [];
		if (event.DOMContexts && event.DOMContexts.length > 0) {
			ret = event.DOMContexts.map(
				function(context, cidx) {
					return {
						HTMLLocationType:
							locationTypes[context.HTMLLocationType],
						HTMLNodeType: context.HTMLNodeType,
						EventContext: context.EventContext,
						RawEvent: event.RawEvent.Data,
						RawEventIndex: cidx,
						EventType: event.EventType,
						EventHost: this.parseHost(event.EventURL),
						EventPath: this.parsePath(event.EventURL),
						Severity: context.Severity
					};
				}.bind(this)
			);
		} else {
			// If there are no DOMContexts, it is most likely an HTTP response.
			return {
				HTMLLocationType: "n/a",
				HTMLNodeType: "n/a",
				EventContext: "n/a",
				RawEvent: event.RawEvent.Data,
				RawEventIndex: 0, // this isn't really correct. there could be a case where there are two of the same tracer in an HTTP response
				EventType: event.EventType,
				EventHost: this.parseHost(event.EventURL),
				EventPath: this.parsePath(event.EventURL),
				Severity: 0
			};
		}

		return ret;
	}

	/* Given an event, give it an ID. */
	enumerate(event, id) {
		event.ID = id + 1;

		return event;
	}

	formatRowSeverity(row, rowIdx) {
		// Enum to human-readable structure to translate the different severity ratings.
		const severity = {
			0: "unexploitable",
			1: "suspicious",
			2: "probable",
			3: "exploitable"
		};
		return severity[row.OverallSeverity];
	}

	/* getTracers makes an XMLHTTPRequest to the tracers/events API to get the latest set of events. */
	getTracers() {
		/* Create the HTTP GET request to the /tracers API endpoint. */
		var req = new Request(`http://127.0.0.1:8081/tracers`, {
			method: "GET",
			headers: { Hoot: "!" }
		});

		fetch(req)
			.then(response => response.json())
			.catch(error => console.error("Error:", error))
			.then(response => {
				try {
					if (
						JSON.stringify(this.state.tracers) !==
						JSON.stringify(response)
					) {
						this.setState({
							tracers: response
						});
					}
				} catch (e) {
					// Probably an error with parsing the JSON.
					console.error(e);
				}
			});
	}

	getTracerEvents(tracerID = this.state.tracer.ID) {
		// By default, the app starts with non of the tracers selected. Don't make a
		// request in this case.
		if (tracerID) {
			var req = new Request(
				`http://127.0.0.1:8081/tracers/${tracerID}/events`,
				{
					method: "GET",
					headers: { Hoot: "!" }
				}
			);

			fetch(req)
				.then(response => response.json())
				.catch(error => console.error("Error:", error))
				.then(response => {
					this.setState({
						events: response
					});
				});
		}
	}

	parseVisibleTracers(requests) {
		const parsedTracers = [].concat
			.apply([], requests.map(n => this.formatRequest(n)))
			.filter(n => n);

		const tracerFilterKeys = ["archivedTracers", "inactive"];
		// Apply filters from the filter column component.
		let filters = Object.keys(this.state.filters).filter(
			n => this.state.filters[n] && tracerFilterKeys.includes(n)
		);
		return filters.reduce((accum, cur) => accum.filter(cur), parsedTracers);
	}

	parseVisibleEvents(events) {
		const parsedEvents = [].concat
			.apply([], events.map(this.formatEvent.bind(this)))
			.map(this.enumerate)
			.filter(n => n);

		const contextFilterKeys = [
			"responses",
			"exploitable",
			"archivedContexts",
			"text"
		];
		// Apply filters from the filter column component.
		let filters = Object.keys(this.state.filters).filter(
			n => this.state.filters[n] && contextFilterKeys.includes(n)
		);
		return filters.reduce((accum, cur) => accum.filter(cur), parsedEvents);
	}

	/* Called whenever one of the filter buttons is toggled. */
	handleFilterChange(evt, filter) {
		this.setState((prevState, props) => {
			prevState.filters[evt] = filter;
			return prevState;
		});
	}

	/* Called whenever a new tracer row is selected. */
	handleTracerSelection(nTracer) {
		if (nTracer.ID !== this.state.tracer.ID) {
			this.setState({
				tracer: nTracer._original,
				event: {}
			});

			this.getTracerEvents(nTracer.ID);
		}
	}

	/* Called whenever a new event is select. */
	handleEventSelection(nEvent) {
		if (nEvent.ID !== this.state.event.ID) {
			this.setState({
				event: nEvent._original
			});
		}
	}

	handleNewTracer(nTracer) {
		let data = JSON.parse(nTracer.data)["Tracer"];
		this.setState((prevState, props) => {
			let match = [].concat
				.apply([], prevState.tracers.map(n => n.Tracers))
				.filter(n => n.ID === data.ID);
			if (match.length === 1) {
				match = match[0];
				Object.keys(data).map(n => {
					if (data[n] !== match[n]) {
						match[n] = data[n];
						return n;
					}
					return null;
				});
			} else {
				prevState.tracers.push(data);
			}

			return prevState;
		});
	}

	handleNewRequest(nRequest) {
		let data = JSON.parse(nRequest.data)["Request"];
		console.log("[REQUEST]:", data);
		this.setState((prevState, props) => {
			let match = prevState.tracers.filter(n => n.ID === data.ID);
			if (match.length === 1) {
				match = match[0];
				Object.keys(data).map(n => {
					if (data[n] !== match[n]) {
						match[n] = data[n];

						//If the key was the RawRequest, we need to update the currently selected tracer
						//with this value as well.
						if (n === "RawRequest") {
							console.log("[RAWREQUEST]:", data);
							//If the matched request has a tracer that is currently selected...
							let selected = match.Tracers.filter(
								m => m.ID === prevState.tracer.ID
							);
							if (selected.length === 1) {
								console.log("Updating selected event");
								prevState.tracer.RawRequest = data[n];
							}
						}
						return n;
					}
					return null;
				});
			} else {
				prevState.tracers.push(data);
			}
			return prevState;
		});
	}

	handleNewEvent(nEvent) {
		let data = JSON.parse(nEvent.data)["TracerEvent"];
		this.setState((prevState, props) => {
			let match = prevState.events.filter(n => n.ID === data.ID);
			if (match.length === 1) {
				match = match[0];
				Object.keys(data).map(n => {
					if (data[n] !== match[n]) {
						match[n] = data[n];
						return n;
					}
					return null;
				});
			} else {
				prevState.events.push(data);
			}
			return prevState;
		});
	}

	componentDidMount() {
		this.getTracers();
	}

	render() {
		return (
			<Row>
				<Col md={12} className="container">
					<Row className="header">
						<Col md={2} className="brand">
							<TracyLogo width={25} />
							<span className="logo-title">tracy</span>
						</Col>
						<Col md={5} />
						<Col md={5}>
							<FilterColumn
								handleFilterChange={this.handleFilterChange}
							/>
						</Col>
					</Row>
					<Row className="tables-row">
						<Col md={6} className="left-top-column">
							<TracerTable
								tracers={this.parseVisibleTracers(
									this.state.tracers
								)}
								handleTracerSelection={
									this.handleTracerSelection
								}
							/>
						</Col>
						<Col md={6} className="right-top-column">
							<TracerEventsTable
								events={this.parseVisibleEvents(
									this.state.events
								)}
								tracer={this.state.tracer}
								handleEventSelection={this.handleEventSelection}
							/>
						</Col>
					</Row>
					<Row className="raw-row">
						<Col className="raw-column" md={12}>
							<DetailsViewer
								tracer={this.state.tracer}
								event={this.state.event}
							/>
						</Col>
					</Row>
					<Row className="link-row">
						<Col md={6}>
							<span>raw request</span>
						</Col>
						<Col md={5}>
							<span>raw output</span>
						</Col>
						<Col md={1}>
							<Row>
								<Col md={5} />
								<Col md={5}>
									<WebSocketRouter
										handleNewTracer={this.handleNewTracer}
										handleNewRequest={this.handleNewRequest}
										handleNewEvent={this.handleNewEvent}
										tracer={this.state.tracer}
									/>
									<InstallLinks />
								</Col>
								<Col md={2} />
							</Row>
						</Col>
					</Row>
				</Col>
			</Row>
		);
	}
}

export default App;
