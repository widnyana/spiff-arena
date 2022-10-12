"""Test Permissions."""
from flask.app import Flask
from flask_bpmn.models.db import db
from tests.spiffworkflow_backend.helpers.base_test import BaseTest
from tests.spiffworkflow_backend.helpers.test_data import load_test_spec

from spiffworkflow_backend.models.group import GroupModel
from spiffworkflow_backend.models.permission_assignment import PermissionAssignmentModel
from spiffworkflow_backend.models.permission_target import PermissionTargetModel
from spiffworkflow_backend.models.principal import PrincipalModel
from spiffworkflow_backend.services.authorization_service import AuthorizationService
from spiffworkflow_backend.services.user_service import UserService


# we think we can get the list of roles for a user.
# spiff needs a way to determine what each role allows.

# user role allows list and read of all process groups/models
# super-admin role allows create, update, and delete of all process groups/models
#  * super-admins users maybe conventionally get the user role as well
# finance-admin role allows create, update, and delete of all models under the finance group
class TestPermissions(BaseTest):
    """TestPermissions."""

    def test_user_can_be_given_permission_to_administer_process_group(
        self, app: Flask, with_db_and_bpmn_file_cleanup: None
    ) -> None:
        """Test_user_can_be_given_permission_to_administer_process_group."""
        process_group_id = "group-a"
        load_test_spec(
            "timers_intermediate_catch_event",
            process_group_id=process_group_id,
        )
        dan = self.find_or_create_user()
        principal = dan.principal

        permission_target = PermissionTargetModel(uri=f"/{process_group_id}")
        db.session.add(permission_target)
        db.session.commit()

        permission_assignment = PermissionAssignmentModel(
            permission_target_id=permission_target.id,
            principal_id=principal.id,
            permission="delete",
            grant_type="permit",
        )
        db.session.add(permission_assignment)
        db.session.commit()

    def test_group_a_admin_needs_to_stay_away_from_group_b(
        self, app: Flask, with_db_and_bpmn_file_cleanup: None
    ) -> None:
        """Test_group_a_admin_needs_to_stay_away_from_group_b."""
        process_group_ids = ["group-a", "group-b"]
        process_group_a_id = process_group_ids[0]
        process_group_b_id = process_group_ids[1]
        for process_group_id in process_group_ids:
            load_test_spec(
                "timers_intermediate_catch_event",
                process_group_id=process_group_id,
            )
        group_a_admin = self.find_or_create_user()

        permission_target = PermissionTargetModel(uri=f"/{process_group_a_id}")
        db.session.add(permission_target)
        db.session.commit()

        permission_assignment = PermissionAssignmentModel(
            permission_target_id=permission_target.id,
            principal_id=group_a_admin.principal.id,
            permission="update",
            grant_type="permit",
        )
        db.session.add(permission_assignment)
        db.session.commit()

        has_permission_to_a = AuthorizationService.user_has_permission(
            user=group_a_admin,
            permission="update",
            target_uri=f"/{process_group_a_id}",
        )
        assert has_permission_to_a is True
        has_permission_to_b = AuthorizationService.user_has_permission(
            user=group_a_admin,
            permission="update",
            target_uri=f"/{process_group_b_id}",
        )
        assert has_permission_to_b is False

    def test_user_can_be_granted_access_through_a_group(
        self, app: Flask, with_db_and_bpmn_file_cleanup: None
    ) -> None:
        """Test_group_a_admin_needs_to_stay_away_from_group_b."""
        process_group_ids = ["group-a", "group-b"]
        process_group_a_id = process_group_ids[0]
        process_group_ids[1]
        for process_group_id in process_group_ids:
            load_test_spec(
                "timers_intermediate_catch_event",
                process_group_id=process_group_id,
            )
        user = self.find_or_create_user()
        group = GroupModel(identifier="groupA")
        db.session.add(group)
        db.session.commit()

        UserService.add_user_to_group(user, group)

        permission_target = PermissionTargetModel(uri=f"/{process_group_a_id}")
        db.session.add(permission_target)
        db.session.commit()

        principal = PrincipalModel(group_id=group.id)
        db.session.add(principal)
        db.session.commit()

        permission_assignment = PermissionAssignmentModel(
            permission_target_id=permission_target.id,
            principal_id=group.principal.id,
            permission="update",
            grant_type="permit",
        )
        db.session.add(permission_assignment)
        db.session.commit()

        has_permission_to_a = AuthorizationService.user_has_permission(
            user=user,
            permission="update",
            target_uri=f"/{process_group_a_id}",
        )
        assert has_permission_to_a is True
