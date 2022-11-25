import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Add,
  Upload,
  Download,
  TrashCan,
  Favorite,
  Edit,
  View,
  ArrowRight,
  // @ts-ignore
} from '@carbon/icons-react';
import {
  Accordion,
  AccordionItem,
  Button,
  Grid,
  Column,
  Stack,
  ButtonSet,
  Modal,
  FileUploader,
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
  // @ts-ignore
} from '@carbon/react';
import { Can } from '@casl/react';
import ProcessBreadcrumb from '../components/ProcessBreadcrumb';
import HttpService from '../services/HttpService';
import ErrorContext from '../contexts/ErrorContext';
import {
  getGroupFromModifiedModelId,
  modifyProcessIdentifierForPathParam,
} from '../helpers';
import {
  PermissionsToCheck,
  ProcessFile,
  ProcessInstance,
  ProcessModel,
} from '../interfaces';
import ButtonWithConfirmation from '../components/ButtonWithConfirmation';
import ProcessInstanceListTable from '../components/ProcessInstanceListTable';
import { usePermissionFetcher } from '../hooks/PermissionService';
import { useUriListForPermissions } from '../hooks/UriListForPermissions';
import ProcessInstanceRun from '../components/ProcessInstanceRun';

export default function ProcessModelShow() {
  const params = useParams();
  const setErrorMessage = (useContext as any)(ErrorContext)[1];

  const [processModel, setProcessModel] = useState<ProcessModel | null>(null);
  const [processInstance, setProcessInstance] =
    useState<ProcessInstance | null>(null);
  const [reloadModel, setReloadModel] = useState<boolean>(false);
  const [filesToUpload, setFilesToUpload] = useState<any>(null);
  const [showFileUploadModal, setShowFileUploadModal] =
    useState<boolean>(false);
  const navigate = useNavigate();

  const { targetUris } = useUriListForPermissions();
  const permissionRequestData: PermissionsToCheck = {
    [targetUris.processModelShowPath]: ['PUT', 'DELETE'],
    [targetUris.processInstanceListPath]: ['GET'],
    [targetUris.processInstanceActionPath]: ['POST'],
    [targetUris.processModelFileCreatePath]: ['POST', 'PUT', 'GET', 'DELETE'],
  };
  const { ability, permissionsLoaded } = usePermissionFetcher(
    permissionRequestData
  );

  const modifiedProcessModelId = modifyProcessIdentifierForPathParam(
    `${params.process_model_id}`
  );

  useEffect(() => {
    const processResult = (result: ProcessModel) => {
      setProcessModel(result);
      setReloadModel(false);
    };
    HttpService.makeCallToBackend({
      path: `/process-models/${modifiedProcessModelId}`,
      successCallback: processResult,
    });
  }, [reloadModel, modifiedProcessModelId]);

  const processInstanceRunResultTag = () => {
    if (processInstance) {
      return (
        <div className="alert alert-success with-top-margin" role="alert">
          <p>
            Process Instance {processInstance.id} kicked off (
            <Link
              to={`/admin/process-models/${modifiedProcessModelId}/process-instances/${processInstance.id}`}
              data-qa="process-instance-show-link"
            >
              view
            </Link>
            ).
          </p>
          <br />
        </div>
      );
    }
    return null;
  };

  const onUploadedCallback = () => {
    setReloadModel(true);
  };
  const reloadModelOhYeah = (_httpResult: any) => {
    setReloadModel(!reloadModel);
  };

  // Remove this code from
  const onDeleteFile = (fileName: string) => {
    const url = `/process-models/${modifiedProcessModelId}/files/${fileName}`;
    const httpMethod = 'DELETE';
    HttpService.makeCallToBackend({
      path: url,
      successCallback: reloadModelOhYeah,
      httpMethod,
    });
  };

  const onSetPrimaryFile = (fileName: string) => {
    const url = `/process-models/${modifiedProcessModelId}`;
    const httpMethod = 'PUT';

    const processModelToPass = {
      primary_file_name: fileName,
    };
    HttpService.makeCallToBackend({
      path: url,
      successCallback: onUploadedCallback,
      httpMethod,
      postBody: processModelToPass,
    });
  };
  const handleProcessModelFileResult = (processModelFile: ProcessFile) => {
    if (
      !('file_contents' in processModelFile) ||
      processModelFile.file_contents === undefined
    ) {
      setErrorMessage({
        message: `Could not file file contents for file: ${processModelFile.name}`,
      });
      return;
    }
    let contentType = 'application/xml';
    if (processModelFile.type === 'json') {
      contentType = 'application/json';
    }
    const element = document.createElement('a');
    const file = new Blob([processModelFile.file_contents], {
      type: contentType,
    });
    const downloadFileName = processModelFile.name;
    element.href = URL.createObjectURL(file);
    element.download = downloadFileName;
    document.body.appendChild(element);
    element.click();
  };

  const downloadFile = (fileName: string) => {
    setErrorMessage(null);
    const processModelPath = `process-models/${modifiedProcessModelId}`;
    HttpService.makeCallToBackend({
      path: `/${processModelPath}/files/${fileName}`,
      successCallback: handleProcessModelFileResult,
    });
  };

  const profileModelFileEditUrl = (processModelFile: ProcessFile) => {
    if (processModel) {
      if (processModelFile.name.match(/\.(dmn|bpmn)$/)) {
        return `/admin/process-models/${modifiedProcessModelId}/files/${processModelFile.name}`;
      }
      if (processModelFile.name.match(/\.(json|md)$/)) {
        return `/admin/process-models/${modifiedProcessModelId}/form/${processModelFile.name}`;
      }
    }
    return null;
  };

  const navigateToProcessModels = (_result: any) => {
    navigate(
      `/admin/process-groups/${getGroupFromModifiedModelId(
        modifiedProcessModelId
      )}`
    );
  };

  const deleteProcessModel = () => {
    HttpService.makeCallToBackend({
      path: `/process-models/${modifiedProcessModelId}`,
      successCallback: navigateToProcessModels,
      httpMethod: 'DELETE',
    });
  };

  const navigateToFileEdit = (processModelFile: ProcessFile) => {
    const url = profileModelFileEditUrl(processModelFile);
    if (url) {
      navigate(url);
    }
  };

  const renderButtonElements = (
    processModelFile: ProcessFile,
    isPrimaryBpmnFile: boolean
  ) => {
    const elements = [];
    let icon = View;
    let actionWord = 'View';
    if (ability.can('PUT', targetUris.processModelFileCreatePath)) {
      icon = Edit;
      actionWord = 'Edit';
    }
    elements.push(
      <Can I="GET" a={targetUris.processModelFileCreatePath} ability={ability}>
        <Button
          kind="ghost"
          renderIcon={icon}
          iconDescription={`${actionWord} File`}
          hasIconOnly
          size="lg"
          data-qa={`edit-file-${processModelFile.name.replace('.', '-')}`}
          onClick={() => navigateToFileEdit(processModelFile)}
        />
      </Can>
    );
    elements.push(
      <Can I="GET" a={targetUris.processModelFileCreatePath} ability={ability}>
        <Button
          kind="ghost"
          renderIcon={Download}
          iconDescription="Download File"
          hasIconOnly
          size="lg"
          onClick={() => downloadFile(processModelFile.name)}
        />
      </Can>
    );

    elements.push(
      <Can
        I="DELETE"
        a={targetUris.processModelFileCreatePath}
        ability={ability}
      >
        <ButtonWithConfirmation
          kind="ghost"
          renderIcon={TrashCan}
          iconDescription="Delete File"
          hasIconOnly
          description={`Delete file: ${processModelFile.name}`}
          onConfirmation={() => {
            onDeleteFile(processModelFile.name);
          }}
          confirmButtonLabel="Delete"
        />
      </Can>
    );
    if (processModelFile.name.match(/\.bpmn$/) && !isPrimaryBpmnFile) {
      elements.push(
        <Can I="PUT" a={targetUris.processModelShowPath} ability={ability}>
          <Button
            kind="ghost"
            renderIcon={Favorite}
            iconDescription="Set As Primary File"
            hasIconOnly
            size="lg"
            onClick={() => onSetPrimaryFile(processModelFile.name)}
          />
        </Can>
      );
    }
    return elements;
  };

  const processModelFileList = () => {
    if (!processModel || !permissionsLoaded) {
      return null;
    }
    let constructedTag;
    const tags = processModel.files.map((processModelFile: ProcessFile) => {
      const isPrimaryBpmnFile =
        processModelFile.name === processModel.primary_file_name;

      let actionsTableCell = null;
      if (processModelFile.name.match(/\.(dmn|bpmn|json|md)$/)) {
        actionsTableCell = (
          <TableCell key={`${processModelFile.name}-cell`}>
            {renderButtonElements(processModelFile, isPrimaryBpmnFile)}
          </TableCell>
        );
      }

      let primarySuffix = '';
      if (isPrimaryBpmnFile) {
        primarySuffix = '- Primary File';
      }
      let fileLink = null;
      const fileUrl = profileModelFileEditUrl(processModelFile);
      if (fileUrl) {
        if (ability.can('GET', targetUris.processModelFileCreatePath)) {
          fileLink = <Link to={fileUrl}>{processModelFile.name}</Link>;
        } else {
          fileLink = <span>{processModelFile.name}</span>;
        }
      }
      constructedTag = (
        <TableRow key={processModelFile.name}>
          <TableCell key={`${processModelFile.name}-cell`}>
            {fileLink}
            {primarySuffix}
          </TableCell>
          {actionsTableCell}
        </TableRow>
      );
      return constructedTag;
    });

    const headers = ['Name', 'Actions'];
    return (
      <Table size="lg" useZebraStyles={false}>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeader id={header} key={header}>
                {header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{tags}</TableBody>
      </Table>
    );
  };

  const handleFileUploadCancel = () => {
    setShowFileUploadModal(false);
    setFilesToUpload(null);
  };

  const handleFileUpload = (event: any) => {
    if (processModel) {
      event.preventDefault();
      const url = `/process-models/${modifiedProcessModelId}/files`;
      const formData = new FormData();
      formData.append('file', filesToUpload[0]);
      formData.append('fileName', filesToUpload[0].name);
      HttpService.makeCallToBackend({
        path: url,
        successCallback: onUploadedCallback,
        httpMethod: 'POST',
        postBody: formData,
      });
    }
    setShowFileUploadModal(false);
    setFilesToUpload(null);
  };

  const fileUploadModal = () => {
    return (
      <Modal
        data-qa="modal-upload-file-dialog"
        open={showFileUploadModal}
        modalHeading="Upload File"
        primaryButtonText="Upload"
        secondaryButtonText="Cancel"
        onSecondarySubmit={handleFileUploadCancel}
        onRequestClose={handleFileUploadCancel}
        onRequestSubmit={handleFileUpload}
      >
        <FileUploader
          labelTitle="Upload files"
          labelDescription="Max file size is 500mb. Only .bpmn, .dmn, and .json files are supported."
          buttonLabel="Add file"
          buttonKind="primary"
          size="md"
          filenameStatus="edit"
          role="button"
          accept={['.bpmn', '.dmn', '.json']}
          disabled={false}
          iconDescription="Delete file"
          name=""
          multiple={false}
          onDelete={() => setFilesToUpload(null)}
          onChange={(event: any) => setFilesToUpload(event.target.files)}
        />
      </Modal>
    );
  };

  const processModelFilesSection = () => {
    if (!processModel) {
      return null;
    }
    return (
      <Grid
        condensed
        fullWidth
        className="megacondensed process-model-files-section"
      >
        <Column md={5} lg={9} sm={3}>
          <Accordion align="end" open>
            <AccordionItem
              open
              data-qa="files-accordion"
              title={
                <Stack orientation="horizontal">
                  <span>
                    <Button size="sm" kind="ghost">
                      Files
                    </Button>
                  </span>
                </Stack>
              }
            >
              <Can
                I="POST"
                a={targetUris.processModelFileCreatePath}
                ability={ability}
              >
                <ButtonSet>
                  <Button
                    renderIcon={Upload}
                    data-qa="upload-file-button"
                    onClick={() => setShowFileUploadModal(true)}
                    size="sm"
                    kind=""
                    className="button-white-background"
                  >
                    Upload File
                  </Button>
                  <Button
                    renderIcon={Add}
                    href={`/admin/process-models/${modifiedProcessModelId}/files?file_type=bpmn`}
                    size="sm"
                  >
                    New BPMN File
                  </Button>
                  <Button
                    renderIcon={Add}
                    href={`/admin/process-models/${modifiedProcessModelId}/files?file_type=dmn`}
                    size="sm"
                  >
                    New DMN File
                  </Button>
                  <Button
                    renderIcon={Add}
                    href={`/admin/process-models/${modifiedProcessModelId}/form?file_ext=json`}
                    size="sm"
                  >
                    New JSON File
                  </Button>
                  <Button
                    renderIcon={Add}
                    href={`/admin/process-models/${modifiedProcessModelId}/form?file_ext=md`}
                    size="sm"
                  >
                    New Markdown File
                  </Button>
                </ButtonSet>
                <br />
              </Can>
              {processModelFileList()}
            </AccordionItem>
          </Accordion>
        </Column>
      </Grid>
    );
  };

  const processInstanceListTableButton = () => {
    if (processModel) {
      return (
        <Grid fullWidth condensed>
          <Column sm={{ span: 3 }} md={{ span: 4 }} lg={{ span: 3 }}>
            <h2>Process Instances</h2>
          </Column>
          <Column
            sm={{ span: 1, offset: 3 }}
            md={{ span: 1, offset: 7 }}
            lg={{ span: 1, offset: 15 }}
          >
            <Button
              data-qa="process-instance-list-link"
              kind="ghost"
              renderIcon={ArrowRight}
              iconDescription="Go to Filterable List"
              hasIconOnly
              size="lg"
              onClick={() =>
                navigate(
                  `/admin/process-instances?process_model_identifier=${processModel.id}`
                )
              }
            />
          </Column>
        </Grid>
      );
    }
    return null;
  };

  if (processModel) {
    return (
      <>
        {fileUploadModal()}
        <ProcessBreadcrumb
          hotCrumbs={[
            ['Process Groups', '/admin'],
            {
              entityToExplode: processModel,
              entityType: 'process-model',
            },
          ]}
        />
        <Stack orientation="horizontal" gap={1}>
          <h1 className="with-icons">
            Process Model: {processModel.display_name}
          </h1>
          <Can I="PUT" a={targetUris.processModelShowPath} ability={ability}>
            <Button
              kind="ghost"
              data-qa="edit-process-model-button"
              renderIcon={Edit}
              iconDescription="Edit Process Model"
              hasIconOnly
              href={`/admin/process-models/${modifiedProcessModelId}/edit`}
            >
              Edit process model
            </Button>
          </Can>
          <Can I="DELETE" a={targetUris.processModelShowPath} ability={ability}>
            <ButtonWithConfirmation
              kind="ghost"
              data-qa="delete-process-model-button"
              renderIcon={TrashCan}
              iconDescription="Delete Process Model"
              hasIconOnly
              description={`Delete process model: ${processModel.display_name}`}
              onConfirmation={deleteProcessModel}
              confirmButtonLabel="Delete"
            />
          </Can>
        </Stack>
        <p className="process-description">{processModel.description}</p>
        <Stack orientation="horizontal" gap={3}>
          <Can
            I="POST"
            a={targetUris.processInstanceActionPath}
            ability={ability}
          >
            <>
              <ProcessInstanceRun
                processModel={processModel}
                onSuccessCallback={setProcessInstance}
              />
              <br />
              <br />
            </>
          </Can>
        </Stack>
        {processInstanceRunResultTag()}
        {processModelFilesSection()}
        <Can I="GET" a={targetUris.processInstanceListPath} ability={ability}>
          {processInstanceListTableButton()}
          <ProcessInstanceListTable
            filtersEnabled={false}
            processModelFullIdentifier={processModel.id}
            perPageOptions={[2, 5, 25]}
            showReports={false}
          />
        </Can>
      </>
    );
  }
  return null;
}
