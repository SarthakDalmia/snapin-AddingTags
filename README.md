# snapin-AddingTags
Adding tags to tickets automatically by searching for keywords in title and description of the ticket itself.

## Steps to run the snap-in:

[Refer this Documentation for basic requirements and setup](https://docs.google.com/document/d/1U7_6TgE9P18NGkz_9Zb9bQiukQ0-KdjayvOxG28H4qU/edit#heading=h.ufym6jrip4vw)

* Only Devrev-PAT Connection is required for this snap in to install and deploy.
* Implement the Automation Interface, to receive webhook events.
* Use Datadog and Cloudwatch logs for debugging purposes.
	
For a demo snap-in code (automation which creates a notification on github branch creation), refer to this repository.
[Let's go to the repository](https://github.com/devrev/flow-lambda-poc)

Since there is no dedicated documentation for web-hook events payload, use Cloudwatch logs (with JSON.stringify()) to view the JSON structure of the incoming event payloads.


## CLI Commands to install and deploy a snap-in:

### Devrev-CLI Authentication
devrev profiles authenticate --env dev --org snapin-test --usr i-sarthak.dalmia@devrev.ai (only once for a single session)

### Create tar.gz Archive of the Files
tar -cvzf output.tar.gz addingTags/

### Create Snap In Package
devrev snap_in_package create-one --slug dev0_snapin --name Dev0  --description "snap in package for adding tags based on keyword matching." | jq .

*(choose a unique slug)*

### Create Snap In Version 
devrev snap_in_version create-one --manifest manifest.yaml --package don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in_package/5b55aae8-daa2-49e2-b8d2-8cb939a90ef0 --archive output.tar.gz | jq . 

*(package id “don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in_package/5b55aae8-daa2-49e2-b8d2-8cb939a90ef0” is received as an output from snap in package creation)*

### Snap in draft
devrev snap_in draft --snap_in_version don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in_package/5b55aae8-daa2-49e2-b8d2-8cb939a90ef0:snap_in_version/723ed6f8-6f27-4f71-9d6f-533887a49773 | jq . 

*(version id “don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in_package/5b55aae8-daa2-49e2-b8d2-8cb939a90ef0:snap_in_version/723ed6f8-6f27-4f71-9d6f-533887a4977” is received as an output from snap in version creation)*

### Updating Snap-in with global inputs (if any)
devrev snap_in update don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in/092dac20-f8b5-46ba-92a0-8ff59a21cf74 (to establish connections with Devrev and third-party applications)

*(“don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in/092dac20-f8b5-46ba-92a0-8ff59a21cf74” is received from draft creation)*

### Snap In deployment
devrev snap_in deploy don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in/092dac20-f8b5-46ba-92a0-8ff59a21cf74 

*(“don:integration:dvrv-us-1:devo/fOFb0IdZ:snap_in/092dac20-f8b5-46ba-92a0-8ff59a21cf74” is received post updating the snap in)*
