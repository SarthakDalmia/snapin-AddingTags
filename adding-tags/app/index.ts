import fetch from "node-fetch"
import {
	AutomationEvent,
	AutomationInterface,
	AutomationMetadata
} from "../sdk"


const API_BASE = 'https://api.dev.devrev-eng.ai/';

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

	// async addTags(tagsCreateMethod: string, addTagsMethod: string , tags: string[], availableTags: string[], authorization: string) {
		
        
        
        
        
        
    //     const url = API_BASE + method;
	// 	const resp = await fetch(url, {
	// 		method: 'POST',
	// 		headers: {
	// 			authorization,
	// 			"content-type": "application/json",
	// 		},
	// 		body: JSON.stringify(data),
	// 	});
	// 	return resp;
	// }


	async getTagsList(method: string, token: string) {


		var requestOptions = {
			method: 'GET',
			headers: {
				Authorization: token
			},
			//redirect: 'follow'
		};

		let params = {
			"limit": 100,
		};

		let query = Object.keys(params)
			.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
			.join('&');

		let url = API_BASE + method + '?' + query;

		const tagsList = await fetch(url, requestOptions)
			.then((response) => (response.json()))
			.then((result) => {
                let str = "";

				for (let i = 0; i < (result.tags).length; i++) {
					
					str = str + " " + result.tags[i].name;
				}
				return str;
			})
			.catch(error => console.log('error', error));

		return tagsList.split(" ");

	}

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
		const tagsListAPIMethodPath = 'tags.list';
        const tagsCreateAPIMethodPath = 'tags.create';
        const addTagsAPIMethodPath = 'works.update';
        const timelineEntryAPIMethodPath = 'timeline-entries.create';

		const devrevToken = event.input_data.keyrings["devrev"];
		let ticketDetails : string[] = [];

		// Fetching title string from ticket using ticket id
		try {
			ticketDetails = await this.getTicketDetails(ticketDetailsAPIMethodPath, ticketID, devrevToken);

		} catch (error) {
			console.error('Error: ', error);
		}
        console.log(ticketDetails);
		try {

			//if (ticketDetails.length != 0) {

			// Get tags list

            // const tagList = await this.getTagsList(tagsListAPIMethodPath, devrevToken);
            
            // const data = await fetch('../tags.json')
            //     .then((response) => {
            //         return response.json()
            //     });

            // const keywords = Object.keys(data);
            // let tagsToBeAdded: string[] = []; 

            // for(let i = 0; i<keywords.length; i++)
            // {
            //     for(let j = 0; j<ticketDetails.length; j++)
            //     {
            //         if(keywords[i].toLowerCase() == ticketDetails[j].toLowerCase())
            //         {
            //             tagsToBeAdded.push(data[keywords[i]]);
            //         }
            //     }
            // }

				const timelineEntryJSON = {
					object: ticketID,
					type: "timeline_comment",
					body: "Hey , adding automatic tags based on tite and description."
				}

			// 	// Checking status change and creating timeline entry request if required.

            const resp = await this.createTimelineEntry(timelineEntryAPIMethodPath, timelineEntryJSON, devrevToken);
            // const resp = await this.addTags(tagsCreateAPIMethodPath, addTagsAPIMethodPath, tagsToBeAdded, tagList, devrevToken);

            if (resp.ok) {
                console.log("Successfully created timeline entry.");
            } else {
                let body = await resp.text();
                console.error("Error while creating timeline entry: ", resp.status, body);
            }
			//}

		} catch (error) {
			console.error('Error: ', error);
		}
	}
}