import fetch from "node-fetch"
import {
	AutomationEvent,
	AutomationInterface,
	AutomationMetadata
} from "../sdk"


const API_BASE = 'https://api.dev.devrev-eng.ai/';
const DON_SERVICE_TYPES = ['identity', 'core', 'integration', 'commerce'];
interface ComponentsMap {
	[key: string]: string;
}

export class App implements AutomationInterface {

	GetMetadata(): AutomationMetadata {
		return {
			name: "E2E SnapIn to automatically Add tags to tickets",
			version: "0.1"
		}
	}

	async Run(events: AutomationEvent[]) {
		console.log("E2E SnapIn to automatically Add tags to tickets");
		await this.EventListener(events[0]);
	}

	async createTimelineEntry(method: string, data: object, authorization: string) {
		const url = API_BASE + method;
		const resp = await fetch(url, {
			method: 'POST',
			headers: {
				authorization,
				"content-type": "application/json",
			},
			body: JSON.stringify(data),
		});
		return resp;
	}


	// async getPartOwners(method: string, partID: string, token: string) {

	// 	//parsing DonV2 to mention users in timeline comment body
	// 	function parseDonV2(donV2: string) {
	// 		const donV2Parts = donV2.split(':');
	// 		if (donV2Parts.length < 4) {
	// 			throw new Error(`Must have at least 4 parts: ${donV2}`);
	// 		}
	// 		if (donV2Parts[0] !== 'don') {
	// 			throw new Error(`Must have a valid don prefix: ${donV2}`);
	// 		}
	// 		if (!DON_SERVICE_TYPES.includes(donV2Parts[1])) {
	// 			throw new Error(`Must have a valid service map: ${donV2}`);
	// 		}
	// 		if (donV2Parts[2] !== 'dvrv-us-1') {
	// 			throw new Error(`Must have a valid partition: ${donV2}`);
	// 		}
	// 		const components = donV2Parts.slice(3);
	// 		return components.reduce((componentsMap: ComponentsMap, component: string) => {
	// 			const componentParts = component.split('/');
	// 			componentsMap[componentParts[0]] = componentParts[1];
	// 			return componentsMap;
	// 		}, {});
	// 	}

	// 	var requestOptions = {
	// 		method: 'GET',
	// 		headers: {
	// 			Authorization: token
	// 		},
	// 		//redirect: 'follow'
	// 	};

	// 	let params = {
	// 		"id": partID,
	// 	};

	// 	let query = Object.keys(params)
	// 		.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
	// 		.join('&');

	// 	let url = API_BASE + method + '?' + query;

	// 	const owner_string = await fetch(url, requestOptions)
	// 		.then((response) => (response.json()))
	// 		.then((result) => {
	// 			let str = "";

	// 			if ((result.part.owned_by).length == 0) {
	// 				return str;
	// 			}

	// 			const {
	// 				devo,
	// 				devu
	// 			} = parseDonV2(result.part.owned_by[0].id);
	// 			const mentionUser = `don:DEV-${devo}:dev_user:DEVU-${devu}`;
	// 			str = str + "<" + mentionUser + ">";

	// 			for (let i = 1; i < (result.part.owned_by).length; i++) {
	// 				const {
	// 					devo,
	// 					devu
	// 				} = parseDonV2(result.part.owned_by[i].id);
	// 				const mentionUser = `don:DEV-${devo}:dev_user:DEVU-${devu}`;
	// 				str = str + ", <" + mentionUser + ">";
	// 			}
	// 			return str;
	// 		})
	// 		.catch(error => console.log('error', error));

	// 	return owner_string;

	// }

    async getTicketDetails(method: string, ticketID: string, token: string){
        var requestOptions = {
            method: 'GET',
			headers: {
				Authorization: token
			},
			//redirect: 'follow'
        };

        let params = {
            "id": ticketID,
        };

        let query = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');

        let url = API_BASE + method + '?' + query;

        let ticketDetails = await fetch(url, requestOptions)
            .then((response) => (response.json()))
            .then((result) => {
                return result.title + " " + result.body;
            })
            .catch(error => console.log('error', error));

        return ticketDetails.split(" ");
    }

	async EventListener(event: AutomationEvent) {

		const s = JSON.stringify(event.payload);
		console.log(`Checking and creating (if needed) a timeline entry for work updation event!`, s);

		// // Current and Previous Work payloads
		// const oldStatus = event.payload.work_updated.old_work.stage.name;
		// const currStatus = event.payload.work_updated.work.stage.name;

		// To get the Work Type
		const workType = event.payload.work_created.work.type;


		// IDs
		// const part_id = event.payload.work_updated.work.applies_to_part.id;
		const ticketID = event.payload.work_created.work.id;

		// Routes
		const ticketDetailsAPIMethodPath = 'works.get';
		const timelineEntryAPIMethodPath = 'timeline-entries.create';

		const devrevToken = event.input_data.keyrings["devrev"];
		let detailsString: string[];



		// Fetching title string from ticket using ticket id
		try {
			detailsString = await this.getTicketDetails(ticketDetailsAPIMethodPath, ticketID, devrevToken);

		} catch (error) {
			console.error('Error: ', error);
		}

		try {

			// if (owners_string != "") {

			// 	// Data for Entry Request API

			// 	const timelineEntryJSON = {
			// 		object: ticket_id,
			// 		type: "timeline_comment",
			// 		body: "Hey " + owners_string + ", this ticket moved to Product Assist stage and may need your attention. You are being notified because you are the part owner of this ticket."
			// 	}

			// 	// Checking status change and creating timeline entry request if required.

			// 	if (currStatus == "awaiting_product_assist" && oldStatus != "awaiting_product_assist" && workType == "ticket") {
			// 		const resp = await this.createTimelineEntry(timelineEntryAPIMethodPath, timelineEntryJSON, devrevToken);

			// 		if (resp.ok) {
			// 			console.log("Successfully created timeline entry.");
			// 		} else {
			// 			let body = await resp.text();
			// 			console.error("Error while creating timeline entry: ", resp.status, body);
			// 		}
			// 	}
			// }

		} catch (error) {
			console.error('Error: ', error);
		}
	}
}