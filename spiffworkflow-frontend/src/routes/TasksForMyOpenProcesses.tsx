import { useEffect, useState } from 'react';
// @ts-ignore
import { Button, Table } from '@carbon/react';
import { Link, useSearchParams } from 'react-router-dom';
import PaginationForTable from '../components/PaginationForTable';
import {
  convertSecondsToFormattedDateTime,
  getPageInfoFromSearchParams,
  modifyProcessModelPath,
} from '../helpers';
import HttpService from '../services/HttpService';
import { PaginationObject } from '../interfaces';

const PER_PAGE_FOR_TASKS_ON_HOME_PAGE = 5;

export default function MyOpenProcesses() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState<PaginationObject | null>(null);

  useEffect(() => {
    const { page, perPage } = getPageInfoFromSearchParams(
      searchParams,
      PER_PAGE_FOR_TASKS_ON_HOME_PAGE
    );
    const setTasksFromResult = (result: any) => {
      setTasks(result.results);
      setPagination(result.pagination);
    };
    HttpService.makeCallToBackend({
      path: `/tasks/for-my-open-processes?per_page=${perPage}&page=${page}`,
      successCallback: setTasksFromResult,
    });
  }, [searchParams]);

  const buildTable = () => {
    const rows = tasks.map((row) => {
      const rowToUse = row as any;
      const taskUrl = `/tasks/${rowToUse.process_instance_id}/${rowToUse.id}`;
      const modifiedProcessModelIdentifier = modifyProcessModelPath(
        rowToUse.process_model_identifier
      );
      return (
        <tr key={rowToUse.id}>
          <td>
            <Link
              data-qa="process-model-show-link"
              to={`/admin/process-models/${modifiedProcessModelIdentifier}`}
            >
              {rowToUse.process_model_display_name}
            </Link>
          </td>
          <td>
            <Link
              data-qa="process-instance-show-link"
              to={`/admin/process-models/${modifiedProcessModelIdentifier}/process-instances/${rowToUse.process_instance_id}`}
            >
              View {rowToUse.process_instance_id}
            </Link>
          </td>
          <td
            title={`task id: ${rowToUse.name}, spiffworkflow task guid: ${rowToUse.id}`}
          >
            {rowToUse.task_title}
          </td>
          <td>{rowToUse.process_instance_status}</td>
          <td>{rowToUse.group_identifier || '-'}</td>
          <td>
            {convertSecondsToFormattedDateTime(
              rowToUse.created_at_in_seconds
            ) || '-'}
          </td>
          <td>
            {convertSecondsToFormattedDateTime(
              rowToUse.updated_at_in_seconds
            ) || '-'}
          </td>
          <td>
            <Button
              variant="primary"
              href={taskUrl}
              hidden={rowToUse.process_instance_status === 'suspended'}
            >
              Go
            </Button>
          </td>
        </tr>
      );
    });
    return (
      <Table striped bordered>
        <thead>
          <tr>
            <th>Process Model</th>
            <th>Process Instance</th>
            <th>Task Name</th>
            <th>Process Instance Status</th>
            <th>Assigned Group</th>
            <th>Process Started</th>
            <th>Process Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    );
  };

  const tasksWaitingForMeComponent = () => {
    if (pagination && pagination.total < 1) {
      return null;
    }
    const { page, perPage } = getPageInfoFromSearchParams(
      searchParams,
      PER_PAGE_FOR_TASKS_ON_HOME_PAGE
    );
    return (
      <>
        <h1>Tasks for my open processes</h1>
        <PaginationForTable
          page={page}
          perPage={perPage}
          perPageOptions={[2, PER_PAGE_FOR_TASKS_ON_HOME_PAGE, 25]}
          pagination={pagination}
          tableToDisplay={buildTable()}
          path="/tasks/for-my-open-processes"
        />
      </>
    );
  };

  const tasksWaitingForMe = tasksWaitingForMeComponent();

  if (pagination) {
    if (tasksWaitingForMe === null) {
      return <p>No tasks are waiting for you.</p>;
    }
    return <>{tasksWaitingForMe}</>;
  }
  return null;
}
